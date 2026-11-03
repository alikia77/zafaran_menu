import numpy as np, json, cv2
from PIL import Image
S=json.load(open('sources.json')); im=np.asarray(Image.open(S['strips']).convert('RGB')).astype(np.float32)/255; H,W=im.shape[:2]
cx,cy,rx,ry,dy=[float(v) for v in __import__('sys').argv[1:6]]
cx,rx=cx*W,rx*W; cy,ry,dy=cy*H,ry*H,dy*H
Y,X=np.mgrid[0:H,0:W].astype(np.float32)
def ell(cy_):
    r=np.sqrt(((X-cx)/rx)**2+((Y-cy_)/ry)**2); return np.clip((1-r)*min(rx,ry)+0.5-0.6,0,1)
side=np.clip(np.minimum(rx-np.abs(X-cx)-0.6+0.5,1),0,1)*((Y>=cy)&(Y<=cy+dy))
A=np.maximum(np.maximum(ell(cy),ell(cy+dy)),side)
m=np.asarray(Image.open('alpha/strips.png')).astype(np.float32)/255
A=np.maximum(A,(m>0.85)*(Y<cy)*1.0*(np.sqrt(((X-cx)/rx)**2+((Y-cy)/ry)**2)<1.15))  # food rising above the rim
out=Image.fromarray((np.dstack([im,A])*255).astype(np.uint8))
bb=Image.fromarray(((A>0.1)*255).astype(np.uint8)).getbbox(); out=out.crop(bb)
s=int(max(out.size)*1.03); sq=Image.new('RGBA',(s,s)); sq.alpha_composite(out,((s-out.width)//2,(s-out.height)//2))
sq.save('out4/cut/strips.png'); r=sq.copy(); r.thumbnail((760,760),Image.LANCZOS); r.save('out4/r/strips.webp','WEBP',quality=90,method=6)
rs=sq.copy(); rs.thumbnail((380,380),Image.LANCZOS); rs.save('out4/rs/strips.webp','WEBP',quality=86,method=6)
c=Image.new('RGB',(s,s),(235,228,215)); c.paste(sq,(0,0),sq); c.resize((500,500)).save('/tmp/claude-0/-home-claude/b5bd76af-b978-5fd3-b382-2766a30be0a1/scratchpad/rc.png')
