"""v2 cut-outs. Round plates: rim found along 720 rays from the colour/edge
profile, a robust ellipse fitted to those rim points, alpha drawn analytically
(perfect anti-aliased edge, nothing nibbled). Free shapes: AI matte refined
with an edge-aware guided filter. Edge colours decontaminated."""
import json, sys, os, numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
SRC=json.load(open('sources.json'))
FREE=set('pizza-pepperoni pizza-special pizza-margherita pizza-beef pizza-chicken pizza-veggie burger-classic burger-cheese burger-double burger-mushroom burger-chicken doogh lemonade mojito sekanjabin shake cola tea tea-saffron tea-borage espresso latte cappuccino water bastani baklava tiramisu cheesecake pudding fries fries-special hotdog strips lasagna caesar salad-fasl sholeh-zard'.split())
SCALLOP=set('ash-reshteh soup-jo mast-musir mast-khiar mirza shirazi zeytoon kashk-bademjan torsh-x'.split())
rng=np.random.default_rng(5)
def gf(I8,p,r,eps):
    I=cv2.cvtColor(I8,cv2.COLOR_RGB2GRAY).astype(np.float32)/255
    bf=lambda x: cv2.boxFilter(x,-1,(2*r+1,2*r+1))
    mI,mp=bf(I),bf(p); cov=bf(I*p)-mI*mp; var=bf(I*I)-mI*mI
    a=cov/(var+eps); b=mp-a*mI
    return bf(a)*I+bf(b)
def sm(x,a,b): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def bgcol(a): b=np.concatenate([a[:12].reshape(-1,3),a[-12:].reshape(-1,3),a[:,:12].reshape(-1,3),a[:,-12:].reshape(-1,3)]); return np.median(b,0)
def ell_r(el,pts):
    (cx,cy),(w,h),ang=el; t=np.deg2rad(ang); c,s=np.cos(t),np.sin(t)
    u=(pts[:,0]-cx)*c+(pts[:,1]-cy)*s; v=-(pts[:,0]-cx)*s+(pts[:,1]-cy)*c
    return np.sqrt((u/(w/2))**2+(v/(h/2))**2)
def ransac(pts,tol=2.5,it=800):
    best=None;bi=0
    for _ in range(it):
        s=pts[rng.choice(len(pts),5,replace=False)]
        try: el=cv2.fitEllipse(s.astype(np.float32))
        except: continue
        if not np.isfinite(el[1]).all() or min(el[1])<80: continue
        inl=np.abs(ell_r(el,pts)-1)*min(el[1])/2<tol
        if inl.sum()>bi: bi=inl.sum(); best=inl
    if best is None: return None,0
    return cv2.fitEllipse(pts[best].astype(np.float32)), bi/len(pts)
def ell_alpha(shape,el,inset=0.6):
    H,W=shape; (cx,cy),(w,h),ang=el
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32); t=np.deg2rad(ang); c,s=np.cos(t),np.sin(t)
    u=(xx-cx)*c+(yy-cy)*s; v=-(xx-cx)*s+(yy-cy)*c; a,b=w/2,h/2
    r=np.sqrt((u/a)**2+(v/b)**2); g=np.sqrt((u/a**2)**2+(v/b**2)**2)+1e-9
    d=(1-r)*r/g if True else 0   # first-order signed distance in px
    return np.clip(d-inset+0.5,0,1)
def process(k):
    im=np.asarray(Image.open(SRC[k]).convert('RGB')).astype(np.float32)/255; H,W=im.shape[:2]
    m=np.asarray(Image.open(f'alpha/{k}.png')).astype(np.float32)/255
    B=bgcol(im); light=B.mean()>0.5
    D=np.linalg.norm(im-B,axis=2)              # distance from the studio background
    if light:   # black porcelain on a pale sweep: the colour distance is the reliable signal
        fg=D>0.3; fg=nd.binary_opening(fg,iterations=2); lab,n=nd.label(fg); sz=nd.sum(fg,lab,range(1,n+1)); fg=nd.binary_fill_holes(lab==(np.argmax(sz)+1)); m=np.maximum(m*fg,fg*1.0)
    hard=(m>0.5).astype(np.uint8)
    mode='free'
    if k not in FREE:
        cnts,_=cv2.findContours(hard,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); pts=max(cnts,key=cv2.contourArea)[:,0,:]
        el,ratio=ransac(pts)
        if el is not None and (ratio>0.45 or light):
            # refine: walk 720 rays, rim = outermost strong foreground before the background
            (cx,cy),(w,h),ang=el; Dg=cv2.GaussianBlur(D,(0,0),1.0); thr=0.45 if light else 0.12
            Mf=cv2.GaussianBlur(m,(0,0),1.0)
            if light:   # plate-ness: black porcelain or saturated gold/food; a grey shadow is neither
                Lm=im.mean(2); mx=im.max(2); mn=im.min(2); sat=(mx-mn)/(mx+1e-4)
                Pl=cv2.GaussianBlur(np.maximum(sm(0.36-Lm,0,0.08),sm(sat,0.28,0.4)*sm(0.92-Lm,0,0.05)).astype(np.float32),(0,0),1.0)
            rp=[]
            for th in np.linspace(0,2*np.pi,720,endpoint=False):
                t=np.deg2rad(ang); ex,ey=np.cos(th)*w/2,np.sin(th)*h/2
                px,py=cx+ex*np.cos(t)-ey*np.sin(t), cy+ex*np.sin(t)+ey*np.cos(t)
                dx,dy=px-cx,py-cy; L=np.hypot(dx,dy); ux,uy=dx/L,dy/L
                ss=np.arange(-0.06*L,0.05*L,0.5); xs=px+ux*ss; ys=py+uy*ss
                ok=(xs>=0)&(xs<W-1)&(ys>=0)&(ys<H-1)
                if ok.sum()<10: continue
                xs,ys,ss=xs[ok],ys[ok],ss[ok]
                prof=nd.map_coordinates(Pl if light else Mf,[ys,xs],order=1)
                t0=0.5
                idx=np.where(prof>t0)[0]
                if not len(idx): continue
                j=idx[-1]
                if j+1<len(prof): f=(prof[j]-t0)/(prof[j]-prof[j+1]+1e-6); s_=ss[j]+f*(ss[j+1]-ss[j])
                else: s_=ss[j]
                rp.append([px+ux*s_,py+uy*s_])
            rp=np.array(rp)
            el2,r2=ransac(rp,tol=1.6,it=1500)
            if el2 is not None and r2>(0.35 if light else 0.5):
                el=el2; mode='plate'
    if mode=='plate':
        E=ell_alpha((H,W),el,0.7)
        (cx,cy),(w,h),ang=el
        near=ell_alpha((H,W),((cx,cy),(w*1.16,h*1.16),ang),0)
        outside=(1-ell_alpha((H,W),el,-1.5))
        ov=(m>0.7)&(near>0.5)&(outside>0.5)&((D>(0.3 if light else 0.15)))
        ov=nd.binary_opening(ov,iterations=2)
        lab,n=nd.label(ov|(E>0.5)); keep=lab==lab[int(cy),int(cx)]; ov=ov&keep
        ovA=gf((im*255).astype(np.uint8),ov.astype(np.float32),3,1e-3)
        A=np.maximum(E,np.clip(ovA,0,1)*(outside>0))
    else:
        A0=sm(m,0.35,0.75)
        A=gf((im*255).astype(np.uint8),A0.astype(np.float32),4,2e-4)
        A=np.clip((A-0.08)/0.84,0,1)
        # keep the main object only
        lab,n=nd.label(A>0.5)
        if n>1:
            sz=nd.sum(A>0.5,lab,range(1,n+1)); big=lab==(np.argmax(sz)+1)
            keep=nd.binary_dilation(big|np.isin(lab,1+np.where(sz>sz.max()*0.03)[0]),iterations=4)
            A=A*keep
    # decontaminate the rim colours
    a3=np.clip(A,0.03,1)[...,None]; F=np.clip((im-(1-a3)*B)/a3,0,1); wv=sm(A,0.05,0.95)[...,None]; F=F*(1-wv)+im*wv
    out=Image.fromarray((np.dstack([F,A])*255+0.5).astype(np.uint8))
    bb=Image.fromarray(((A>0.06)*255).astype(np.uint8)).getbbox(); x0,y0,x1,y1=bb
    cx_,cy_=(x0+x1)/2,(y0+y1)/2; side=int(max(x1-x0,y1-y0)*1.03)
    sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.alpha_composite(out.crop((int(cx_-side/2),int(cy_-side/2),int(cx_-side/2)+side,int(cy_-side/2)+side)))
    sq.save(f'out4/cut/{k}.png')
    r=sq.copy(); r.thumbnail((760,760),Image.LANCZOS); r.save(f'out4/r/{k}.webp','WEBP',quality=90,method=6)
    rs=sq.copy(); rs.thumbnail((380,380),Image.LANCZOS); rs.save(f'out4/rs/{k}.webp','WEBP',quality=86,method=6)
    return mode
if __name__=='__main__':
    for k in (sys.argv[1:] or list(SRC)):
        try: print(k, process(k), flush=True)
        except Exception as e: import traceback; print(k,'ERR',e, flush=True)
