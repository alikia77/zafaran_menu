import numpy as np
from PIL import Image, ImageFilter
W,H=960,1760
CH={ # chapter: dish, kind(top|side), width as fraction of W, centre y as fraction of H
 'kebab':('koobideh','top',1.32,.40),'stew':('ghormeh','top',1.28,.40),'polo':('zereshk','top',1.32,.40),
 'starter':('mirza','top',1.25,.40),'pizza':('pizza-pepperoni','top',1.42,.40),'burger':('burger-double','side',1.05,.44),
 'pasta':('pasta-alfredo','top',1.30,.40),'sandwich':('hotdog','side',1.1,.42),'salad':('caesar','side',1.15,.42),
 'cold':('mojito','side',.86,.42),'hot':('tea-saffron','side',1.0,.43),'dessert':('baklava','side',1.3,.42)}
COL={'kebab':('#150b06','#d2601e'),'stew':('#0c1009','#4f6a1c'),'polo':('#170e05','#e09a1a'),'starter':('#121010','#b9925a'),'pizza':('#160b07','#c8341a'),'burger':('#110d09','#c8781e'),'pasta':('#13100a','#d8b25a'),'sandwich':('#120e0a','#d89a2a'),'salad':('#0a110a','#4a8a26'),'cold':('#061015','#2a8a90'),'hot':('#140a05','#a8521a'),'dessert':('#170c10','#c86a86')}
hx=lambda h:np.array([int(h[i:i+2],16) for i in (1,3,5)],np.float32)/255
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
rng=np.random.default_rng(7)
for ch,(dish,kind,wf,cy) in CH.items():
    bg,glow=map(hx,COL[ch])
    base=bg*1.25+0.012
    # backdrop: a dark room with one warm pool of light behind the dish
    d=np.hypot((xx-W*.5)/(W*.9),(yy-H*cy)/(H*.42))
    light=np.exp(-d**2*2.2)
    img=base[None,None,:]+light[...,None]*(glow*0.20+np.array([.05,.04,.03]))
    # stone surface with soft falloff + grain
    img*= (1-0.35*np.clip((yy/H-0.75)/0.25,0,1))[...,None]
    img+= rng.normal(0,0.008,(H,W,1))
    canvas=Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8)).convert('RGBA')
    import os
    cut=Image.open(f'out4/cut/{dish}.png' if os.path.exists(f'out4/cut/{dish}.png') and dish not in ('pasta-alfredo','lasagna','hotdog') else (f'out3/cut/{dish}.png' if dish=='hotdog' else f'out2/cut/{dish}.png')).convert('RGBA'); cut=cut.crop(cut.getchannel('A').point(lambda v: 255 if v>60 else 0).getbbox())
    if False:  # calm the bright porcelain so the food leads
        ca=np.asarray(cut).astype(np.float32)/255; mx=ca[...,:3].max(-1); mn=ca[...,:3].min(-1); sat=(mx-mn)/(mx+1e-4)
        k=np.clip((mx-.6)/.3,0,1)*np.clip(1-sat*3,0,1); ca[...,:3]*=(1-.38*k)[...,None]; cut=Image.fromarray((ca*255).astype(np.uint8))
    tw=int(W*wf); th=int(cut.height*tw/cut.width)
    if kind=='side' and th>H*.62: th=int(H*.62); tw=int(cut.width*th/cut.height)
    cut=cut.resize((tw,th),Image.LANCZOS)
    x=(W-tw)//2; y=int(H*cy-th/2)
    a=np.asarray(cut)[...,3]
    if kind=='top':
        sh=Image.fromarray(a).filter(ImageFilter.GaussianBlur(28)); sh_a=np.asarray(sh).astype(np.float32)/255*0.75
        S=Image.fromarray(np.dstack([np.zeros((th,tw,3),np.uint8),(sh_a*255).astype(np.uint8)]))
        canvas.alpha_composite(S,(x+10,y+34))
    else:
        # contact shadow + soft reflection on a polished surface
        base_y=y+th
        e=Image.new('L',(tw,80),0); ea=np.zeros((80,tw),np.float32); ey,ex=np.mgrid[0:80,0:tw]; ea=np.exp(-(((ex-tw/2)/(tw*.36))**2+((ey-40)/14)**2))*0.8
        canvas.alpha_composite(Image.fromarray(np.dstack([np.zeros((80,tw,3),np.uint8),(ea*255).astype(np.uint8)])),(x,base_y-46))
        ref=cut.transpose(Image.FLIP_TOP_BOTTOM); ra=np.asarray(ref).astype(np.float32); fade=np.clip(1-np.arange(th)/(th*.35),0,1)[:,None]*0.16
        ra[...,3]*=fade; canvas.alpha_composite(Image.fromarray(ra.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)),(x,base_y-6))
    canvas.alpha_composite(cut,(x,y))
    out=canvas.convert('RGB')
    # gentle overall grade: lift warmth in highlights, vignette
    o=np.asarray(out).astype(np.float32)/255; v=1-0.45*np.clip(np.hypot((xx-W/2)/(W*.75),(yy-H*.45)/(H*.6))-0.55,0,1)
    o=o*v[...,None]
    Image.fromarray((np.clip(o,0,1)*255).astype(np.uint8)).save(f'hdr/ch-{ch}.webp',quality=88,method=6)
print('ok')
