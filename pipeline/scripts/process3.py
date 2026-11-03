import json, os, numpy as np
from PIL import Image, ImageFilter, ImageDraw
from matte import alpha_of
src='/mnt/user-data/uploads/Downloads/غذا/جدید/'
import sys
fs=sorted(os.listdir(src)); idx=dict(enumerate(fs))
MAP={'water':0,'latte':1,'cappuccino':2,'tahchin':3,'torsh':4,'soltani':5,'baghali':6,'lubia':7,'zereshk':8,'sabzi-mahi':9}
for d in ['r','rs','c','cut']: os.makedirs('out2/'+d,exist_ok=True)
def card_bg():
    bg=Image.new('RGBA',(960,836),(22,19,16,255))
    glow=Image.new('L',(960,836),0); ImageDraw.Draw(glow).ellipse((160,80,800,760),fill=95); glow=glow.filter(ImageFilter.GaussianBlur(100))
    return Image.composite(Image.new('RGBA',(960,836),(74,55,36,255)),bg,glow)
for key,i in MAP.items():
    im=Image.open(src+idx[i]).convert('RGB'); a=np.asarray(alpha_of(im)).astype(np.float32)/255
    light=np.asarray(im).mean()>140
    a=np.clip((a-0.10)/0.82,0,1)
    A=Image.fromarray((a*255).astype(np.uint8))
    if light: A=A.filter(ImageFilter.MinFilter(3))   # bite into the light fringe
    A=A.filter(ImageFilter.GaussianBlur(0.6))
    out=im.convert('RGBA'); out.putalpha(A)
    bb=Image.fromarray(((np.asarray(A)>25)*255).astype(np.uint8)).getbbox()
    x0,y0,x1,y1=bb; cx,cy=(x0+x1)/2,(y0+y1)/2; side=int(max(x1-x0,y1-y0)*1.04)
    sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.alpha_composite(out.crop((int(cx-side/2),int(cy-side/2),int(cx-side/2)+side,int(cy-side/2)+side)))
    sq.save(f'out2/cut/{key}.png')
    r=sq.copy(); r.thumbnail((760,760),Image.LANCZOS); r.save(f'out2/r/{key}.webp','WEBP',quality=86,method=6)
    rs=sq.copy(); rs.thumbnail((380,380),Image.LANCZOS); rs.save(f'out2/rs/{key}.webp','WEBP',quality=82,method=6)
    bg=card_bg(); s=sq.copy(); s.thumbnail((760,740),Image.LANCZOS); bg.alpha_composite(s,((960-s.size[0])//2,(836-s.size[1])//2+10))
    bg.convert('RGB').resize((480,418),Image.LANCZOS).save(f'out2/c/{key}.webp','WEBP',quality=82,method=6)
    print(key, end=' ', flush=True)
