import json,sys,base64,re
d=json.load(open(sys.argv[1])); t=d[0]['text'] if isinstance(d,list) else d
m=re.search(r'data:image/\w+;base64,([A-Za-z0-9+/=]+)',t); open(sys.argv[2],'wb').write(base64.b64decode(m.group(1))); print('ok')
