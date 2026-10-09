"""Offline reference fixture only: a sealed rectangular prism, NOT a production hull solver.
Usage: python3 generate-prism-cross-curves.py manifest.json output.csv
Uses package LBP, beam, depth; samples upright drafts 1–5 m every 0.25 m.
At each heel, clip the rotated rectangular section at an iterated waterline,
conserve submerged area, then evaluate the buoyancy centroid's horizontal
coordinate from the rotated baseline origin (signed KN). End effects excluded.
"""
import json, math, sys
from pathlib import Path
manifest=json.loads(Path(sys.argv[1]).read_text());dimensions=manifest['principalDimensions']
length=dimensions['lbp'];beam=dimensions['beam'];depth=dimensions['mouldedDepth']
def clip(polygon, waterline):
 result=[]
 for index,start in enumerate(polygon):
  end=polygon[(index+1)%len(polygon)];inside=start[1]<=waterline;next_inside=end[1]<=waterline
  if inside:result.append(start)
  if inside != next_inside:
   fraction=(waterline-start[1])/(end[1]-start[1]);result.append((start[0]+fraction*(end[0]-start[0]),waterline))
 return result

def area_centroid(polygon):
 if len(polygon)<3:return 0,0
 twice_area=moment=0
 for i,(x,z) in enumerate(polygon):
  xx,zz=polygon[(i+1)%len(polygon)];cross=x*zz-xx*z;twice_area+=cross;moment+=(x+xx)*cross
 return twice_area/2,moment/(3*twice_area) if twice_area else 0

def kn(draft,angle):
 radians=math.radians(angle);co=math.cos(radians);si=math.sin(radians)
 polygon=[(y*co+z*si,z*co-y*si) for y,z in [(-beam/2,0),(beam/2,0),(beam/2,depth),(-beam/2,depth)]]
 low=min(z for _,z in polygon);high=max(z for _,z in polygon)
 for _ in range(80):
  middle=(low+high)/2;area,_=area_centroid(clip(polygon,middle))
  if area<beam*draft:low=middle
  else:high=middle
 area,centroid=area_centroid(clip(polygon,(low+high)/2))
 assert abs(area-beam*draft)<1e-9
 return centroid
angles=sorted(set([0,1,2]+list(range(5,91,5))+[-1,-2]+list(range(-90,0,5))))
rows=['volume,heelDeg,kn']
for step in range(17):
 draft=1+step/4
 for angle in angles:rows.append(f'{length*beam*draft:.12g},{angle},{kn(draft,angle):.12g}')
# Independent wall-sided check while neither deck edge nor bilge leaves water.
radians=math.radians(1);draft=3;bm=beam**2/(12*draft);km=draft/2+bm
assert abs(kn(draft,1)-(km+0.5*bm*math.tan(radians)**2)*math.sin(radians))<1e-10
output=Path(sys.argv[2]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text('\n'.join(rows)+'\n')
print(f'{len(rows)-1} KN points written; area conservation and 1-degree wall-sided check passed.')
