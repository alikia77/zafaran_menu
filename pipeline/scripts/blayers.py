import numpy as np, json
from PIL import Image, ImageFilter
import colorsys
def load(n):
    im=Image.open(f'out2/cut/{n}.png').convert('RGBA'); return im
def hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; mx=a[...,:3].max(-1); mn=a[...,:3].min(-1); d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    return h, d/(mx+1e-6), mx
def clean(m,o=2):
    im=Image.fromarray((m*255).astype(np.uint8))
    im=im.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    return np.asarray(im).astype(np.float32)/255
SPEC={}
def layer(name, src, y0, y1, fn, seat, top):
    im=load(src); a=np.asarray(im).astype(np.float32)/255; H,W=a.shape[:2]
    h,s,v=hsv(a); yy=(np.arange(H)/H)[:,None]*np.ones((1,W))
    band=((yy>=y0)&(yy<=y1)).astype(np.float32)
    m0=(fn(h,s,v,yy)&(band>0)&(a[...,3]>.5))
    # per column: fill solidly between the first and last pixel of this ingredient,
    # so charred gaps and sesame flecks don't punch holes in the layer
    from scipy.ndimage import median_filter, binary_closing
    cnt=m0.sum(0); has=cnt>=max(3,int(H*.006))
    has=binary_closing(has,np.ones(15))
    tp=np.where(m0.any(0),m0.argmax(0),0).astype(float); bt=np.where(m0.any(0),H-1-m0[::-1].argmax(0),0).astype(float)
    idx=np.where(has)[0]
    tp=np.interp(np.arange(W),idx[m0[:,idx].any(0)],tp[idx][m0[:,idx].any(0)]); bt=np.interp(np.arange(W),idx[m0[:,idx].any(0)],bt[idx][m0[:,idx].any(0)])
    tp=median_filter(tp,9); bt=median_filter(bt,9)
    Y=np.arange(H)[:,None]
    m=((Y>=tp[None,:])&(Y<=bt[None,:])&has[None,:]).astype(np.float32)
    m=np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)/255*a[...,3]
    ys,xs=np.where(m>0.05); bb=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
    out=np.dstack([a[...,:3],m]); img=Image.fromarray((out*255).astype(np.uint8)).crop(bb)
    sc=0.5; img=img.resize((int(img.width*sc),int(img.height*sc)),Image.LANCZOS)
    img.save(f'../p/bl/{name}.webp',quality=86,method=6)
    bb=tuple(int(v) for v in bb); SPEC[name]={'x':bb[0]/W,'y':bb[1]/H,'w':(bb[2]-bb[0])/W,'h':(bb[3]-bb[1])/H,'seat':seat,'top':top}
green=lambda h,s,v,y:(h>55)&(h<150)&(s>.3)
red=lambda h,s,v,y:((h<14)|(h>340))&(s>.5)&(v>.35)
purple=lambda h,s,v,y:(((h>270)&(h<=345))&(s>.18))|((h>330)|(h<10))&(s<.5)&(v>.55)
dark=lambda h,s,v,y:(v<.5)&~((h>55)&(h<150)&(s>.3))&~(((h<14)|(h>340))&(s>.55)&(v>.4))
notgreen=lambda h,s,v,y:~((h>55)&(h<150)&(s>.3))
cheesepatty=lambda h,s,v,y:(dark(h,s,v,y)|((h>25)&(h<55)&(s>.55)&(v>.55)))&~((h>55)&(h<150)&(s>.3))&~(((h<14)|(h>340))&(s>.5)&(v>.35)&(y<.6))
fried=lambda h,s,v,y:(h>12)&(h<45)&(s>.45)&~((h>55)&(h<150))
bottom=lambda h,s,v,y:notgreen(h,s,v,y)&~((v<.33)&(y<.74))
layer('bun-top','burger-classic',.08,.383,lambda h,s,v,y:notgreen(h,s,v,y)&((v>.3)|(y<.33)),.383,.10)
layer('lettuce','burger-classic',.33,.50,green,.475,.35)
layer('tomato','burger-classic',.445,.532,red,.53,.45)
layer('onion','burger-classic',.51,.578,lambda h,s,v,y:purple(h,s,v,y)&~red(h,s,v,y),.575,.515)
layer('patty','burger-classic',.605,.745,dark,.735,.605)
layer('patty-cheese','burger-cheese',.575,.728,cheesepatty,.728,.585)
layer('patty-chicken','burger-chicken',.5,.715,fried,.71,.51)
layer('bun-bot','burger-classic',.70,.90,bottom,.89,.72)
json.dump(SPEC,open('blayers.json','w'),indent=0); print(json.dumps(SPEC))
