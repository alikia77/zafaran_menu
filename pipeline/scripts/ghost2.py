import numpy as np, cv2, json, sys
from PIL import Image, ImageFilter
MAP={'cola':'cola','latte':'latte','doogh':'doogh','espresso':'espresso','water':'water','tea':'tea','tea-saffron':'tea','tea-borage':'tea','lemonade':'lemonade','mojito':'lemonade','sekanjabin':'lemonade'}
LB=json.load(open('pour2.json')) if len(sys.argv)<2 else {}
def mask(a,t=0.5): return (a>t).astype(np.uint8)
def register(Af,Ae):
    n=200; f=cv2.resize(Af,(n,n),interpolation=cv2.INTER_AREA); e=cv2.resize(Ae,(n,n),interpolation=cv2.INTER_AREA)
    F=f>0.5; E=e>0.5
    ys,xs=np.where(F); fy1=ys.max(); ys2,xs2=np.where(E); ey1=ys2.max()
    def rowsw(M,y): r=np.where(M[y])[0]; return (r.max()-r.min()+1, (r.max()+r.min())/2) if len(r) else (0,0)
    eh=ey1-ys2.min()
    yb=int(ey1-0.12*eh); we,ce=rowsw(E,yb)
    best=(-1,None)
    for s in np.linspace(0.3,1.6,66):
        # anchor: empty bottom maps to full bottom, centres aligned at the band row
        for dyo in range(-6,7,2):
            ty=fy1+dyo-s*ey1
            wf,cf=rowsw(F,int(np.clip(ty+s*yb,0,n-1)))
            for dxo in range(-6,7,2):
                tx=cf+dxo-s*ce
                M=np.float32([[s,0,tx],[0,s,ty]]); W=cv2.warpAffine(E.astype(np.uint8),M,(n,n))>0
                lower=np.zeros_like(F); top=int(ty+s*(ey1-0.75*eh)); lower[max(0,top):]=True
                inter=(W&F&lower).sum(); uni=((W|F)&lower).sum()+1
                iou=inter/uni
                if iou>best[0]: best=(iou,(s,tx,ty))
    s,tx,ty=best[1]; k_f=Af.shape[0]/n; k_e=Ae.shape[0]/n
    # map empty-pixel coords -> full-pixel coords
    M=np.float32([[s*k_f/k_e,0,tx*k_f],[0,s*k_f/k_e,ty*k_f]])
    return M,best[0]
out={}
for k,ek in MAP.items():
    full=Image.open(f'../p/r/{k}.webp').convert('RGBA'); fa=np.asarray(full).astype(np.float32)/255
    Af=fa[...,3]; N=Af.shape[0]
    E=np.asarray(Image.open(f'empty/{ek}.png').convert('RGB')).astype(np.float32)/255
    Ae=np.asarray(Image.open(f'empty/{ek}_a.png')).astype(np.float32)/255
    M,iou=register(Af,Ae)
    Ew=cv2.warpAffine(E,M,(N,N),flags=cv2.INTER_CUBIC)
    a=np.clip(Ew.max(2)*1.35,0,1)**0.85
    col=np.clip(Ew/np.clip(a,1e-3,1)[...,None],0,1)
    sil=cv2.dilate((Af>0.08).astype(np.uint8),np.ones((5,5),np.uint8)).astype(np.float32)
    sil=cv2.GaussianBlur(sil,(0,0),1.5)
    a=a*sil
    lb=LB.get(k,{}).get('lb',0.9)
    yy=(np.arange(N)/N)[:,None]*np.ones((1,N))
    below=np.clip((yy-lb)/0.012,0,1)
    ga=a*(1-below)+fa[...,3]*below
    gc=col*(1-below[...,None])+fa[...,:3]*below[...,None]
    Image.fromarray((np.dstack([gc,ga])*255).astype(np.uint8)).save(f'../p/g/{k}.webp',quality=88,method=6)
    out[k]=round(float(iou),3)
print(out)
