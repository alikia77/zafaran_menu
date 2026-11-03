import json, os, numpy as np
from PIL import Image, ImageFilter, ImageDraw
src='/mnt/user-data/uploads/Downloads/غذا/'
idx={int(k):v for k,v in json.load(open('index.json')).items()}
MAP={ 'soup-jo':0,'mast-musir':1,'kashk-bademjan':2,'bastani':3,'zeytoon':5,'baklava':6,'tiramisu':7,'hotdog':8,'ash-reshteh':9,'mast-khiar':10,
 'cheesecake':11,'mirza':12,'fries-special':13,'pudding':14,'tahchin':15,'strips':16,'shirazi':17,'torsh':18,'sholeh-zard':19,'barg':20,'koobideh':21,
 'shishlik':23,'doogh':24,'lemonade':25,'mojito':26,'sekanjabin':27,'shake':28,'cola':29,'tea':30,'tea-saffron':31,'tea-borage':32,'espresso':33,
 'pizza-pepperoni':34,'pizza-special':35,'pizza-margherita':36,'pizza-beef':37,'pizza-chicken':38,'pizza-veggie':39,
 'burger-classic':40,'burger-cheese':41,'burger-double':42,'burger-mushroom':43,'burger-chicken':44,'caesar':45,'salad-fasl':46,
 'ghormeh':47,'gheymeh-bademjan':48,'gheymeh':49,'fesenjan':50,'pasta-bolognese':51,'pasta-penne':52,'pasta-alfredo':53,'lasagna':54,'fries':55,
 'joojeh':57,'loghmeh':58,'bakhtiari':59 }
PLATE={0,1,2,5,9,10,12,15,17,18,20,21,23,34,35,36,37,38,39,47,48,49,50,51,52,53,54,57,58,59}
os.makedirs('out/r',exist_ok=True); os.makedirs('out/rs',exist_ok=True); os.makedirs('out/c',exist_ok=True); os.makedirs('out/full',exist_ok=True)

def fg_mask(a, t=48):
    # background = median of the border pixels; foreground = clearly different
    b=np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3),a[:,:6].reshape(-1,3),a[:,-6:].reshape(-1,3)])
    bg=np.median(b,0)
    d=np.abs(a.astype(np.int16)-bg).sum(-1)
    return d>t, bg

def plate_cut(im):
    a=np.asarray(im.convert('RGB')); H,W=a.shape[:2]
    m,bg=fg_mask(a)
    if bg.mean()>150: m=(a.astype(np.float32)@np.array([.299,.587,.114]))<95  # light studio: the dark plate itself
    # largest blob ~ the plate; use row/column profiles robust to scatter
    rows=np.where(m.mean(1)>0.06)[0]; cols=np.where(m.mean(0)>0.06)[0]
    y0,y1,x0,x1=rows[0],rows[-1],cols[0],cols[-1]
    cx,cy=(x0+x1)/2,(y0+y1)/2; r=max(x1-x0,y1-y0)/2*(0.99 if bg.mean()>150 else 1.005)
    side=int(r*2*1.02); L=int(cx-side/2); T=int(cy-side/2)
    crop=im.convert('RGB').crop((L,T,L+side,T+side))
    S=crop.size[0]; alpha=Image.new('L',(S*4,S*4),0); d=ImageDraw.Draw(alpha)
    rr=r*4; c=S*2; d.ellipse((c-rr,c-rr,c+rr,c+rr),fill=255)
    alpha=alpha.resize((S,S),Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    out=crop.convert('RGBA'); out.putalpha(alpha); return out

def scene_cut(im):
    a=np.asarray(im.convert('RGB')); H,W=a.shape[:2]
    m,bg=fg_mask(a)
    rows=np.where(m.mean(1)>0.03)[0]; cols=np.where(m.mean(0)>0.03)[0]
    y0,y1,x0,x1=rows[0],rows[-1],cols[0],cols[-1]
    cx,cy=(x0+x1)/2,(y0+y1)/2; side=int(max(x1-x0,y1-y0)*1.12); side=min(side,W,H)
    L=int(min(max(cx-side/2,0),W-side)); T=int(min(max(cy-side/2,0),H-side))
    crop=im.convert('RGB').crop((L,T,L+side,T+side)).convert('RGBA')
    # feather the edges into transparency so the scene floats on the dark page
    S=side; yy,xx=np.mgrid[:S,:S]; d=np.sqrt(((xx-S/2)/(S/2))**2+((yy-S/2)/(S/2))**2)
    al=np.clip((1.0-d)/0.22,0,1)**1.4
    edge=np.minimum.reduce([xx,yy,S-1-xx,S-1-yy])/(S*0.08); al=np.minimum(al,np.clip(edge,0,1))
    crop.putalpha(Image.fromarray((al*255).astype(np.uint8))); return crop

report={}
for key,i in MAP.items():
    im=Image.open(src+idx[i]); kind='plate' if i in PLATE else 'scene'
    out=plate_cut(im) if kind=='plate' else scene_cut(im)
    r=out.copy(); r.thumbnail((720,720),Image.LANCZOS); r.save(f'out/r/{key}.webp','WEBP',quality=84,method=6)
    rs=out.copy(); rs.thumbnail((360,360),Image.LANCZOS); rs.save(f'out/rs/{key}.webp','WEBP',quality=80,method=6)
    # card: the original framing, cover-cropped to 480x418 around the subject
    full=im.convert('RGB'); W,H=full.size; tw,th=960,836; s=max(tw/W,th/H); f2=full.resize((int(W*s),int(H*s)),Image.LANCZOS)
    L=(f2.size[0]-tw)//2; T=(f2.size[1]-th)//2; f2.crop((L,T,L+tw,T+th)).resize((480,418),Image.LANCZOS).save(f'out/c/{key}.webp','WEBP',quality=80,method=6)
    fl=full.copy(); fl.thumbnail((1200,1200),Image.LANCZOS); fl.save(f'out/full/{key}.webp','WEBP',quality=84,method=6)
    report[key]=kind
json.dump(report,open('kinds.json','w'),indent=0)
print(len(report))
