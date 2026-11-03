import numpy as np, json
from PIL import Image, ImageFilter
G = {  # liquid bottom, liquid top (fractions of height)
 'doogh':(.90,.20),'lemonade':(.92,.20),'mojito':(.92,.20),'sekanjabin':(.92,.20),'shake':(.86,.27),
 'cola':(.93,.10),'tea':(.82,.18),'tea-saffron':(.80,.17),'tea-borage':(.80,.18),'espresso':(.70,.22)}
SAU={'tea':(.6,.24,.72),'tea-saffron':(.6,.25,.75),'tea-borage':(.6,.25,.75),'espresso':(.56,.21,.8)}
out={}
for n,(lb,lt) in G.items():
    im=Image.open(f'p/r/{n}.webp').convert('RGBA'); a=np.asarray(im).astype(np.float32)/255
    rgb,al=a[...,:3],a[...,3]
    L=rgb@np.array([.299,.587,.114]); mx,mn=rgb.max(-1),rgb.min(-1); sat=(mx-mn)/(mx+1e-4)
    h,w=al.shape; yy=(np.arange(h)/h)[:,None]
    # clear glass: keep bright, neutral glints; drop coloured liquid/garnish
    glint=np.clip((L-.5)/.4,0,1)**1.4*np.clip(1-sat*2.2,0,1)
    # rim/edge: the outline of the cut-out reads as glass wall
    edge=np.asarray(Image.fromarray((al*255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)).astype(np.float32)/255
    edge=np.asarray(Image.fromarray((np.clip(edge*3,0,1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)/255
    ga=np.clip(glint*.75+edge*.45+.05,0,.8)*al
    col=np.clip(.55+.45*L[...,None]+0*rgb,0,1)*np.array([1,.985,.96])
    ghost=np.dstack([col,ga])
    xx=(np.arange(w)/w)[None,:]
    if n=='doogh': ga=np.clip(glint*.22+edge*.45+.04,0,.6)*al
    ga=np.where(yy<lt-.01,ga*.45,ga)
    ghost=np.dstack([col,ga])
    below=(yy>lb+.004)  # base / saucer stays as photographed
    if n in SAU: st,x0,x1=SAU[n]; below=below|((yy>st)&((xx<x0)|(xx>x1)))
    m=np.asarray(Image.fromarray((below*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32)/255
    if n in SAU:  # inside the glass over the saucer: a smoky, dimmed glimpse of the original
        st=SAU[n][0]; zone=((yy>st)&(yy<=lb+.004)).astype(np.float32)
        zone=np.asarray(Image.fromarray((zone*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(16))).astype(np.float32)/255*(1-m)
        smoky=np.dstack([rgb*.16+.05,al*.85])
        ghost=ghost*(1-zone[...,None])+smoky*zone[...,None]
    ghost=ghost*(1-m[...,None])+a*m[...,None]
    Image.fromarray((ghost*255).astype(np.uint8)).save(f'p/g/{n}.webp',quality=86,method=6)
    # liquid colour: median of the middle band of the liquid
    y0,y1=int(h*(lt+(lb-lt)*.45)),int(h*(lt+(lb-lt)*.65)); band=rgb[y0:y1][al[y0:y1]>.9]
    c=np.median(band,0); out[n]={'lb':lb,'lt':lt,'c':'#%02x%02x%02x'%tuple((c*255).astype(int))}
print(json.dumps(out))
json.dump(out,open('gen/pour.json','w'))
