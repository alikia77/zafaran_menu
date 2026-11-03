import sys
from PIL import Image
ks=sys.argv[1:]; S=300
c=Image.new('RGB',(S*len(ks),S*3),(16,26,30))
for i,k in enumerate(ks):
  f=Image.open(f'../p/r/{k}.webp').convert('RGBA').resize((S,S)); g=Image.open(f'../p/g/{k}.webp').convert('RGBA').resize((S,S)); m=Image.open(f'../p/gm/{k}.webp').convert('L').resize((S,S))
  c.paste(f,(i*S,0),f); c.paste(g,(i*S,S),g)
  ov=Image.new('RGBA',(S,S),(16,26,30,255)); ov.alpha_composite(g); red=Image.new('RGBA',(S,S),(255,0,0,0)); red.putalpha(m.point(lambda v:int(v*0.45))); ov.alpha_composite(red); c.paste(ov.convert('RGB'),(i*S,2*S))
c.save('/tmp/claude-0/-home-claude/b5bd76af-b978-5fd3-b382-2766a30be0a1/scratchpad/g3.png')
