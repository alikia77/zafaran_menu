"""Register a real empty glass onto the finished-drink photo by matching the
glass's width profile (row by row, from the base up — garnish above the rim
is ignored), then build: the empty ghost (p/g), and the glass interior mask
(p/gm) that confines the rising liquid."""
import numpy as np, cv2, json, sys
from PIL import Image
from scipy import ndimage as nd
N=760
def prof(A, thr=0.5):
    M=A>thr; H=M.shape[0]; w=np.zeros(H); c=np.zeros(H)
    for y in range(H):
        r=np.where(M[y])[0]
        if len(r): w[y]=r.max()-r.min()+1; c[y]=(r.max()+r.min())/2
    return w,c
def load_full(k):
    a=np.asarray(Image.open(f'../p/r/{k}.webp').convert('RGBA')).astype(np.float32)/255
    return a
def fit(Af, Ae, top_frac, xr=None):
    # Af: full alpha (N×N); Ae: empty alpha (resized to N). Return s, tx, ty mapping empty→full.
    if xr is not None:
        X=np.arange(N)/N; Af=Af*((X>=xr[0])&(X<=xr[1]))[None,:]; Ae=Ae*((X>=xr[0])&(X<=xr[1]))[None,:]
    wf,cf=prof(Af); we,ce=prof(Ae)
    yf=np.where(wf>0)[0]; ye=np.where(we>0)[0]
    fb,ft=yf.max(),yf.min(); eb,et=ye.max(),ye.min()
    rows=np.arange(int(fb-(fb-ft)*top_frac), fb+1)
    best=(1e9,None)
    for s in np.linspace(0.5,2.0,151):
        for dy in range(-12,13,2):
            ty=fb+dy-s*eb
            ye_=(rows-ty)/s; ok=(ye_>=0)&(ye_<N-1)
            if ok.sum()<20: continue
            yi=ye_[ok].astype(int); wE=we[yi]*s; wF=wf[rows[ok]]
            m=(wE>0)&(wF>0)
            if m.sum()<20: continue
            cost=np.mean(np.abs(wE[m]-wF[m]))+3*np.mean(wE[m]==0)
            if cost<best[0]: best=(cost,(s,ty,rows[ok][m],yi[m]))
    s,ty,rf,re=best[1]
    tx=np.median(cf[rf]-s*ce[re])
    return s,tx,ty,best[0]
def build(k, ek, top_frac=0.55, lb=None, xr=None, keepfull=None, cup=False):
    full=load_full(k); Af=full[...,3]
    E=np.asarray(Image.open(f'empty/{ek}.png').convert('RGB').resize((N,N),Image.LANCZOS)).astype(np.float32)/255
    Ae=np.asarray(Image.open(f'empty/{ek}_a.png').resize((N,N),Image.LANCZOS)).astype(np.float32)/255
    s,tx,ty,cost=fit(Af,Ae,top_frac,xr)
    M=np.float32([[s,0,tx],[0,s,ty]])
    Ew=cv2.warpAffine(E,M,(N,N),flags=cv2.INTER_CUBIC); Aw=cv2.warpAffine(Ae,M,(N,N),flags=cv2.INTER_LINEAR)
    if xr is not None:
        X=np.arange(N)/N; Aw=Aw*((X>=xr[0]-0.02)&(X<=xr[1]+0.02))[None,:]
    # glass as see-through crystal: luminance → alpha (keeps reflections, drops the black studio)
    lum=Ew.max(2); ga=np.clip(lum*1.35,0,1)**0.85*Aw
    gc=np.clip(Ew/np.clip(lum,1e-3,1)[...,None],0,1)
    # interior: the glass silhouette, slightly eroded, above the base
    S=(Aw>0.5).astype(np.uint8)
    yy=(np.arange(N)/N)[:,None]*np.ones((1,N))
    I=cv2.erode(S,np.ones((5,5),np.uint8)).astype(np.float32)
    if lb is not None: I=I*np.clip((lb-yy)/0.01+0.5,0,1)
    if cup:   # only the inside of the cup/glass; saucer, handle, bottle stay the photograph
        Sm=(Af>0.5)
        if xr is not None: X=np.arange(N)/N; Sm=Sm&((X>=xr[0])&(X<=xr[1]))[None,:]
        rows=[y for y in range(N) if Sm[y].any()]; yt=rows[0]
        L=lambda y: np.where(Sm[y])[0].min(); Rr=lambda y: np.where(Sm[y])[0].max()
        W=lambda y: Rr(y)-L(y)
        wref=max(W(y) for y in range(yt,yt+int(0.15*N)) if Sm[y].any())
        y0=next(y for y in range(yt,yt+int(0.15*N)) if Sm[y].any() and W(y)>=0.85*wref)
        cx0=np.median([(L(y)+Rr(y))/2 for y in range(y0,y0+12)])
        J=np.zeros_like(I); prev=None; yb=int((lb or 0.9)*N); frozen=False; hist=[]; slope=0
        for y in range(y0,yb):
            if not Sm[y].any(): break
            if not frozen and prev is not None: hist.append(prev); slope=(hist[-1]-hist[-12])/11 if len(hist)>12 else 0; slope=max(0,slope)
            l=L(y)
            if prev is not None and l<prev-5: frozen=True     # the saucer begins: carry the cup wall on
            if not frozen: prev=l if prev is None else min(prev+3,max(prev-5,l))
            else: prev=prev+slope
            a_=int(prev+5); b_=int(2*cx0-prev-5)
            if b_>a_: J[y,a_:b_]=1
        I=J
        if k.startswith('tea'):   # tulip glasses bulge at the foot: take the tea itself as the interior
            hsv0=cv2.cvtColor((full[...,:3]*255).astype(np.uint8),cv2.COLOR_RGB2HSV); X0=np.arange(N)[None,:]; Y0=np.arange(N)[:,None]
            liq=(hsv0[...,1]>70)&(hsv0[...,2]>25)&(np.abs(X0-cx0)<0.2*N)&(Y0<yb)&(Y0>y0)
            liq=nd.binary_fill_holes(nd.binary_closing(liq,iterations=4)); lab,n=nd.label(liq)
            if n: sz=nd.sum(liq,lab,range(1,n+1)); liq=lab==(np.argmax(sz)+1)
            I=np.maximum(I,liq.astype(np.float32))
            for y in range(N):   # a glass is convex across each row
                r=np.where(I[y]>0.5)[0]
                if len(r): I[y,r.min():r.max()+1]=1
        if k=='tea':   # the rock-candy stick in front of the glass stays put
            hsv=cv2.cvtColor((full[...,:3]*255).astype(np.uint8),cv2.COLOR_RGB2HSV); yy2=np.arange(N)[:,None]
            nab=(hsv[...,0]>8)&(hsv[...,0]<28)&(hsv[...,1]>150)&(hsv[...,2]>170)&(yy2>0.6*N)
            I=I*(1-cv2.dilate(nab.astype(np.uint8),np.ones((9,9),np.uint8)))
    I=cv2.GaussianBlur(I,(0,0),1.2)
    # ghost = photo everywhere outside the glass that sits on the table (saucer, bottle, base);
    # garnish above the glass is left out so it can fade in when the drink is ready
    base=np.clip((yy-(lb if lb else 0.9)+0.02)/0.02,0,1)
    outside=1-cv2.GaussianBlur(S.astype(np.float32),(0,0),1.5)
    keep=outside*base
    if keepfull is not None:
        X=(np.arange(N)/N)[None,:]*np.ones((N,1)); kf=((X>=keepfull[0])&(X<=keepfull[1])).astype(np.float32); kf=cv2.GaussianBlur(kf,(0,0),2)
        keep=np.maximum(keep,kf)
    inside=1-keep
    if cup:
        inside=cv2.GaussianBlur(cv2.dilate((I>0.3).astype(np.uint8),np.ones((7,7),np.uint8)).astype(np.float32),(0,0),1.5); keep=1-inside
    gA=full[...,3]*keep + ga*inside
    gC=(full[...,:3]*(full[...,3]*keep)[...,None] + gc*(ga*inside)[...,None])/np.clip(gA,1e-4,1)[...,None]
    Image.fromarray((np.dstack([np.clip(gC,0,1),np.clip(gA,0,1)])*255).astype(np.uint8)).save(f'../p/g/{k}.webp',quality=88,method=6)
    Image.fromarray((I*255).astype(np.uint8)).save(f'../p/gm/{k}.webp',quality=90,method=6)
    # glass centre at mid-height and rim height, for the pour stream
    ys,xs=np.where(I>0.5); top=ys.min()/N; mid=int((ys.min()+ys.max())/2); r=np.where(I[mid]>0.5)[0]; cx=(r.min()+r.max())/2/N
    return dict(s=round(s,3),cost=round(cost,2),sx=round(cx,3),it=round(top,3))
if __name__=='__main__':
    import os; os.makedirs('../p/gm',exist_ok=True)
    P=json.load(open('pour2.json')); out={}
    CUP={'espresso','latte','tea','tea-saffron','tea-borage','water'}
    J={'cola':('cola',.6,None,None,None),'lemonade':('high',.55,None,None,None),'sekanjabin':('high',.55,None,None,None),'mojito':('high',.5,None,None,None),
       'shake':('shake',.6,None,None,None),'espresso':('espresso',.7,None,None,None),'latte':('latte',.7,None,None,None),
       'tea':('tea',.7,None,None,None),'tea-saffron':('tea',.7,None,None,None),'tea-borage':('tea',.7,None,None,None),
       'water':('water',.9,None,(0.47,0.85),(0.0,0.47))}
    for k,(ek,tf,_,xr,kf) in J.items():
        if sys.argv[1:] and k not in sys.argv[1:]: continue
        lb=P.get(k,{}).get('lb')
        out[k]=build(k,ek,tf,lb,xr,kf,k in CUP); print(k,out[k],flush=True)
    json.dump(out,open('reg2.json','w'))
