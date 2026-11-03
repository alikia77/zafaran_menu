"""Clean cut-outs: a RANSAC-fitted ellipse gives plates and bowls a perfect,
anti-aliased rim; the AI matte only adds what genuinely rises above or
overhangs the plate. Soft halos are cut and edge colours are decontaminated
from the studio background."""
import json, sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
SRC=json.load(open('sources.json'))
rng=np.random.default_rng(3)
def smooth(x,a,b): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def ellipse_mask(shape,el,shrink=1.5):
    (cx,cy),(w,h),ang=el; H,W=shape
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32); t=np.deg2rad(ang); c,s=np.cos(t),np.sin(t)
    u=(xx-cx)*c+(yy-cy)*s; v=-(xx-cx)*s+(yy-cy)*c; a,b=w/2,h/2
    r=np.sqrt((u/a)**2+(v/b)**2); d=(1-r)*min(a,b)   # approx signed px distance to rim
    return np.clip((d-shrink)/1.6+0.5,0,1)
def ransac_ellipse(pts,iters=600):
    best=None;bi=0; n=len(pts)
    for _ in range(iters):
        s=pts[rng.choice(n,6,replace=False)]
        try: el=cv2.fitEllipse(s.astype(np.float32))
        except: continue
        (cx,cy),(w,h),ang=el
        if w<50 or h<50 or not np.isfinite([cx,cy,w,h]).all(): continue
        t=np.deg2rad(ang); c,sn=np.cos(t),np.sin(t)
        u=(pts[:,0]-cx)*c+(pts[:,1]-cy)*sn; v=-(pts[:,0]-cx)*sn+(pts[:,1]-cy)*c
        r=np.sqrt((u/(w/2))**2+(v/(h/2))**2); inl=np.abs(r-1)*min(w,h)/2<3
        k=inl.sum()
        if k>bi: bi=k; best=inl
    if best is None: return None,0
    el=cv2.fitEllipse(pts[best].astype(np.float32)); return el,bi/n
def bg_color(a):
    b=np.concatenate([a[:16].reshape(-1,3),a[-16:].reshape(-1,3),a[:,:16].reshape(-1,3),a[:,-16:].reshape(-1,3)]); return np.median(b,0)
def process(k, mode=None):
    im=np.asarray(Image.open(SRC[k]).convert('RGB')).astype(np.float32)/255
    m=np.asarray(Image.open(f'alpha/{k}.png')).astype(np.float32)/255
    H,W=m.shape; B=bg_color(im)
    hard=(m>0.5).astype(np.uint8)
    if B.mean()>0.5:   # dark plate on a light studio sweep: segment by colour, the matte can't see black porcelain
        from scipy import ndimage as nd
        L=im.mean(2); mx=im.max(2); mn=im.min(2); sat=(mx-mn)/(mx+1e-4)
        fg=(L<0.3)|((sat>0.3)&(L<0.9)); fg=nd.binary_opening(fg,iterations=2)
        lab,n=nd.label(fg); sz=nd.sum(fg,lab,range(1,n+1)); fg=nd.binary_fill_holes(lab==(np.argmax(sz)+1))
        hard=fg.astype(np.uint8); m=fg.astype(np.float32); mode=mode or 'plate'
    cnts,_=cv2.findContours(hard,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnt=max(cnts,key=cv2.contourArea); pts=cnt[:,0,:]
    el,ratio=ransac_ellipse(pts)
    area_m=hard.sum()
    use_el=False
    if el is not None and mode not in ('free','tight'):
        (cx,cy),(w,h),ang=el; ea=np.pi*w*h/4
        use_el = (ratio>0.42 and 0.75<ea/area_m<1.35) or mode=='plate'
    core=smooth(m,0.42,0.8) if mode!='tight' else smooth(m,0.8,0.95)   # matte without its soft halo
    if use_el:
        E=ellipse_mask((H,W),el,2.5)
        if B.mean()>0.5:   # trim any grey shadow caught on the rim band
            L=im.mean(2); mx=im.max(2); mn=im.min(2); sat=(mx-mn)/(mx+1e-4)
            (cx,cy),(w,h),ang=el; band=E*(1-ellipse_mask((H,W),((cx,cy),(w*0.94,h*0.94),ang),0))
            shadowy=(sat<0.14)&(L>0.3)
            E=E*(1-band*shadowy)
        # overhang: strong matte just outside the rim (garnish, a bone, a lemon wheel)
        (cx,cy),(w,h),ang=el
        near=ellipse_mask((H,W),((cx,cy),(w*1.18,h*1.18),ang),0)
        A=np.maximum(E, core*near*(m>0.8))
    else:
        A=core
        if mode=='tight':   # keep only the food itself
            from scipy import ndimage as nd
            E0=nd.binary_erosion(A>0.5,iterations=10); lab,n=nd.label(E0); sz=nd.sum(E0,lab,range(1,n+1)); keep=nd.binary_dilation(lab==(np.argmax(sz)+1),iterations=12)
            Hh,Ww=A.shape; yy,xx=np.mgrid[0:Hh,0:Ww]; ys,xs=np.where(A>0.5); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
            zone=((xx-x0)/(x1-x0)>0.6)&((yy-y0)/(y1-y0)<0.42)
            dark=smooth(0.3-im.max(2),0,0.08)
            A=A*keep*(1-dark*zone)
            op=nd.binary_dilation(nd.binary_opening(A>0.5,iterations=12),iterations=4); A=A*np.where(zone,op,1)
    A=np.asarray(Image.fromarray((A*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)/255
    # colour decontamination on the semi-transparent rim
    a3=np.clip(A,0.02,1)[...,None]; F=np.clip((im-(1-a3)*B)/a3,0,1)
    w=smooth(A,0.05,0.95)[...,None]; F=F*(1-w)+im*w
    out=Image.fromarray((np.dstack([F,A])*255).astype(np.uint8))
    bb=Image.fromarray(((A>0.1)*255).astype(np.uint8)).getbbox(); x0,y0,x1,y1=bb
    cx,cy=(x0+x1)/2,(y0+y1)/2; side=int(max(x1-x0,y1-y0)*1.04)
    sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.alpha_composite(out.crop((int(cx-side/2),int(cy-side/2),int(cx-side/2)+side,int(cy-side/2)+side)))
    sq.save(f'out3/cut/{k}.png')
    r=sq.copy(); r.thumbnail((760,760),Image.LANCZOS); r.save(f'out3/r/{k}.webp','WEBP',quality=88,method=6)
    rs=sq.copy(); rs.thumbnail((380,380),Image.LANCZOS); rs.save(f'out3/rs/{k}.webp','WEBP',quality=84,method=6)
    return use_el, ratio
if __name__=='__main__':
    keys=sys.argv[1:] or list(SRC)
    for k in keys:
        md={'cappuccino':'free','tiramisu':'free','hotdog':'tight'}.get(k)
        try: print(k, *process(k, md), flush=True)
        except Exception as e: print(k,'ERR',e)
