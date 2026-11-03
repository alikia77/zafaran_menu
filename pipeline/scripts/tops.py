import numpy as np, json
from PIL import Image, ImageFilter
T = {  # key: (source, cx, cy, r, solid) — r and centre as fractions of the pizza photo
 'pepperoni': ('pizza-pepperoni', .575, .733, .052, .62),
 'mushroom': ('pizza-beef', .31, .19, .052, .62),
 'olive': ('pizza-special', .465, .345, .036, .6),
 'pepper': ('pizza-beef', .447, .238, .028, .55),
 'onion': ('pizza-special', .6, .2, .05, .55),
 'corn': ('pizza-veggie', .62, .19, .03, .55),
 'jalapeno': ('pizza-beef', .738, .258, .026, .55),
 'tomato': ('pizza-margherita', .767, .417, .042, .6),
 'basil': ('pizza-margherita', .525, .717, .05, .6),
 'chicken': ('pizza-chicken', .5, .75, .05, .55),
 'beef': ('pizza-beef', .25, .45, .045, .55),
 'extraCheese': ('pizza-special', .62, .62, .075, .35),
}
out={}
for k,(src,cx,cy,r,solid) in T.items():
    im=Image.open(f'out2/cut/{src}.png').convert('RGBA'); W=im.width
    R=int(r*W); box=(int(cx*W)-R,int(cy*W)-R,int(cx*W)+R,int(cy*W)+R)
    p=im.crop(box).resize((160,160),Image.LANCZOS); a=np.asarray(p).astype(np.float32)/255
    yy,xx=np.mgrid[0:160,0:160]; d=np.hypot(xx-79.5,yy-79.5)/80
    # organic edge: wobble the radius a little so patches don't read as perfect discs
    ang=np.arctan2(yy-79.5,xx-79.5); rng=np.random.default_rng(hash(k)%1000)
    wob=1+sum(rng.uniform(-.06,.06)*np.cos(n*ang+rng.uniform(0,6.28)) for n in (2,3,5))
    d=d/wob
    al=np.clip((1-d)/(1-solid),0,1)**1.4
    a[...,3]*=al
    Image.fromarray((a*255).astype(np.uint8)).save(f'../p/tp/{k}.webp',quality=86,method=6)
    out[k]=r
json.dump(out,open('tops.json','w')); print(out)
