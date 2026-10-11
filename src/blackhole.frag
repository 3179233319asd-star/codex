#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float intensity;

const float PI = 3.14159265359;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 37.71)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float v = noise(p)*.53;
  p = mat2(1.63,1.17,-1.17,1.63)*p + 9.4;
  v += noise(p)*.27;
  p = mat2(1.63,1.17,-1.17,1.63)*p + 17.1;
  v += noise(p)*.13;
  return v + noise(p*2.03+5.7)*.07;
}
float filteredFbm(vec2 p, float footprint) {
  float v = mix(noise(p),.5,smoothstep(.30,.80,footprint))*.53;
  p = mat2(1.63,1.17,-1.17,1.63)*p + 9.4;
  footprint *= 2.01;
  v += mix(noise(p),.5,smoothstep(.30,.80,footprint))*.27;
  p = mat2(1.63,1.17,-1.17,1.63)*p + 17.1;
  footprint *= 2.01;
  v += mix(noise(p),.5,smoothstep(.30,.80,footprint))*.13;
  return v + mix(noise(p*2.03+5.7),.5,smoothstep(.30,.80,footprint*2.03))*.07;
}

vec3 stars(vec2 p, float scale, float density, float seed) {
  vec2 grid = p * scale + seed;
  vec2 cell = floor(grid);
  float rnd = hash(cell + seed);
  if (rnd > density) return vec3(0);
  vec2 d = fract(grid) - (.15 + .7*hash2(cell+seed*2.31));
  float bright = hash(cell+11.7);
  float size = mix(.00042,.0012,pow(bright,3.0))*scale;
  float core = exp(-dot(d,d)/(size*size));
  float halo = exp(-length(d)*12.0)*.12;
  float spikes = exp(-abs(d.x)*150.0-abs(d.y)*16.0)
               + exp(-abs(d.y)*150.0-abs(d.x)*16.0);
  spikes *= smoothstep(.88,.995,bright)*.11;
  float flicker = .88+.12*sin(time*(.22+bright*.52)+rnd*179.0);
  vec3 temperature = mix(vec3(.78,.88,1),vec3(1,.88,.74),hash(cell+4.4));
  return temperature*(core+halo+spikes)*(.065+2.0*pow(bright,7.0))*flicker;
}

// Unresolved distant galaxies: an inclined dusty disc, an elongated nucleus
// and broken arms, all evaluated from noise rather than an image texture.
vec3 galaxy(vec2 sky, vec2 center, float angle, vec2 size, float seed) {
  vec2 q = sky-center;
  q = mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
  q /= size;
  float radius = length(q);
  if (radius>2.0) return vec3(0);
  float dust = fbm(q*vec2(9.0,4.0)+seed);
  float arms = .45+.55*noise(vec2(radius*15.0,atan(q.y,q.x)*3.0+radius*7.0)+seed);
  float envelope = exp(-radius*3.7);
  float nucleus = exp(-dot(q*vec2(1.0,1.7),q*vec2(1.0,1.7))*35.0);
  return vec3(.48,.56,.67)*envelope*dust*arms*.28
       + vec3(.83,.80,.72)*nucleus*.32;
}

vec3 brightStar(vec2 sky, vec2 center, vec3 tint, float phase) {
  vec2 q = sky-center;
  float core = exp(-dot(q,q)/.0000020);
  float halo = exp(-dot(q,q)/.000039)*.08;
  float rays = exp(-abs(q.x)*2300.0-abs(q.y)*240.0)
             + exp(-abs(q.y)*2300.0-abs(q.x)*240.0);
  float breathe = .95+.05*sin(time*.24+phase);
  return tint*(core*2.4+halo+rays*.055)*breathe;
}

vec3 background(vec3 direction) {
  vec2 sky = vec2(atan(direction.x,-direction.z),asin(clamp(direction.y,-1.0,1.0)));
  float cloud = fbm(sky*4.6+vec2(8.3,3.7));
  float dust = pow(fbm(sky*34.0),3.0);
  float cloudBreaks = smoothstep(.28,.62,fbm(sky*9.0+23.7));
  // Distant stars form loose concentrations separated by genuinely dark sky.
  vec3 col = stars(sky,210.0,.027*mix(.25,1.15,cloudBreaks),17.3)*.85;
  col += stars(sky,105.0,.027,65.71)*1.4;
  col += stars(sky,72.0,.055,27.5)*.8;
  col += stars(sky,36.0,.021,92.2)*1.7;
  col += stars(sky,19.0,.019,43.4)*2.2;
  col += brightStar(sky,vec2(-.467,.119),vec3(1.0,.97,.91),1.7);
  col += brightStar(sky,vec2(.509,.092),vec3(.67,.81,1.0),4.1);
  col += brightStar(sky,vec2(-.599,.214),vec3(.80,.88,1.0),2.3)*.62;
  col += brightStar(sky,vec2(-.431,-.426),vec3(1.0,.70,.44),3.1)*.48;
  col += brightStar(sky,vec2(.255,-.488),vec3(.84,.90,1.0),5.3)*.66;
  float centerline = sky.y+.23-sky.x*.53+(fbm(sky*7.0+9.0)-.5)*.10;
  float milky = exp(-pow(centerline/.10,2.0))*cloudBreaks;
  col += vec3(.18,.26,.36)*pow(cloud,3.0)*dust*milky*.68;
  float mist = max(fbm(sky*6.2+vec2(9.2,17.1))*fbm(sky*37.0)-.19,0.0);
  col += vec3(.17,.23,.31)*mist*milky*.72;
  col += vec3(.10,.15,.21)*pow(max(cloud-.38,0.0)*1.6,3.0)*dust*.32;
  col += galaxy(sky,vec2(.49,-.39),-.78,vec2(.055,.012),14.3)*1.55;
  col += galaxy(sky,vec2(.28,.23),-.64,vec2(.031,.009),52.1)*1.08;
  return col;
}

// The rear image opens out only as it meets the inclined disc. Keeping the
// map monotonic lets long filaments turn inwards without folds or thick feet.
float shoulderOffset(vec2 uv) {
  float x = abs(uv.x);
  float flare = .65*(1.0-smoothstep(.003,.050,uv.y))
              *smoothstep(-.035,-.021,uv.y);
  float distance = max(x-.205,0.0);
  float eased = distance-.008*(1.0-exp(-distance/.008));
  return eased*flare*(1.0-smoothstep(.50,.90,x));
}

// Unequally spaced long gas ribbons. Each radial lane has its own width,
// centre and angular density; periodic bends keep complete orbits seamless.
float orbitalFilament(float radius, float theta, float frequency, float seed, float worldScale) {
  float coordinate = radius*frequency
                   +1.10*sin(theta*3.0+radius*.41+seed)
                   +.65*sin(theta*7.0-radius*.29+seed*1.7);
  float centralLane = floor(coordinate);
  float footprint = frequency*worldScale/resolution.y;
  vec2 orbit = vec2(cos(theta),sin(theta))*2.7;
  float light = 0.0;
  // Integrate unresolved ribbons over the pixel while conserving their light.
  // Neighbouring tails have their own irregular centres and angular density.
  for (int neighbour=-2;neighbour<=2;neighbour++) {
    if (abs(neighbour)>1 && footprint<1.2) continue;
    float lane = centralLane+float(neighbour);
    float center = .18+.64*hash(vec2(lane,seed));
    float width = .065+.060*hash(vec2(lane+13.7,seed+4.3));
    float filteredWidth = sqrt(width*width+footprint*footprint/6.0);
    float distance = coordinate-lane-center;
    float core = exp(-pow(distance/filteredWidth,2.0))*width/filteredWidth;
    vec2 densityOffset = hash2(vec2(lane,seed+17.9))*43.0;
    float density = noise(orbit+densityOffset);
    // Most gas strands remain dim; isolated hot streams carry the highlights.
    float brightness = .12+4.0*pow(hash(vec2(lane+73.1,seed+31.7)),4.0);
    light += core*smoothstep(.22,.73,density)*brightness;
  }
  return mix(light,.083,smoothstep(1.3,2.6,footprint));
}

// Noise ridges also become unresolved in the grazing projection. Integrate
// their nonlinear intensity toward its mean instead of sampling a point grid.
float filteredRidge(float ridge, float meanLight, float frequency, float worldScale) {
  float footprint = frequency*worldScale/resolution.y;
  return mix(ridge,meanLight,smoothstep(.30,.80,footprint));
}

// Low optical-depth light scattered through the extended gas photosphere.
// Independent drifting scales break up the continuous ray images into soft
// silver threads, dark gaps and isolated knots. The photon shadow stays clear.
vec3 scatteredGas(vec2 uv) {
  float radius = length(uv);
  if (radius<.198 || radius>.48) return vec3(0);
  float angle = atan(uv.y,uv.x);
  float lower = 1.0-smoothstep(-.02,.06,uv.y);
  float warp = fbm(vec2(angle*6.0-time*.035,radius*24.0+8.1));
  float r = radius+(warp-.5)*.010;
  float flow = angle*11.0-time*.055;
  float strand = filteredFbm(vec2(r*83.0+warp*2.2,flow),83.0/resolution.y);
  float fine = noise(vec2(r*267.0+warp*5.0,flow*2.1));
  float patches = fbm(vec2(angle*17.0-time*.07,r*45.0+27.3));
  float fineRidge = pow(max(1.0-abs(fine*2.0-1.0),0.0),6.0);
  fineRidge = filteredRidge(fineRidge,.222,267.0,1.0);
  float fragments = smoothstep(.23,.70,patches);
  float longThread = orbitalFilament(r,angle-time*.04,137.0,41.3,1.0);
  float threads = (.07+pow(strand,3.0)*1.35+fineRidge*.55+longThread*.20)
                *(.30+fragments*.95);
  float inner = smoothstep(.198,.213,r);
  float outer = 1.0-smoothstep(.37,.46,r);
  float hotRadius = mix(.270,.241,lower);
  float hot = exp(-pow((r-hotRadius)/mix(.041,.047,lower),2.0));
  float haze = exp(-pow((r-mix(.332,.336,lower))/.073,2.0));
  float foreground = mix(1.0,smoothstep(.12,.195,-uv.y),lower);
  vec3 warm = vec3(1.0,.94,.86);
  vec3 silver = vec3(.45,.51,.60);
  vec3 light = warm*hot*mix(.60,1.10,lower)+silver*haze*mix(.24,.46,lower);
  float knots = pow(noise(vec2(r*431.0,angle*89.0-time*.14)),15.0);
  light *= threads;
  light += vec3(1.0,.85,.65)*knots*haze*.45;
  float innerHaze = exp(-pow((r-.228)/.026,2.0))*.52;
  light += warm*innerHaze*(.5+strand*.8);
  // A few independent, interrupted filaments cross the faint inner sheath.
  // Unequal radii, slowly drifting bends and long gaps avoid regular wire rings.
  const float filamentRadii[8] = float[8](.204,.214,.225,.241,.261,.279,.310,.330);
  float rear = smoothstep(-.018,.021,uv.y);
  vec2 filamentUV = uv;
  filamentUV.x -= sign(uv.x)*shoulderOffset(uv);
  float filamentRadius = length(filamentUV);
  float filamentAngle = atan(filamentUV.y,filamentUV.x);
  vec3 filaments = vec3(0);
  for (int i=0;i<8;i++) {
    float seed = float(i)*19.37;
    float bend = (noise(vec2(filamentAngle*2.1-time*.016,seed))-.5)*.008;
    float distance = filamentRadius-filamentRadii[i]-bend;
    float gaps = smoothstep(.28,.70,noise(vec2(filamentAngle*2.3-time*.027,seed+8.6)));
    float width = max(mix(.0011,.0016,hash(vec2(seed,7.1))),.65/resolution.y);
    float core = exp(-pow(distance/width,2.0));
    float soft = exp(-pow(distance/.0042,2.0));
    vec3 tint = mix(warm,silver,smoothstep(.27,.32,filamentRadii[i]));
    float strength = i==0?.32:(i==1?.50:(i==2?.40:
                     mix(.24,.15,smoothstep(.24,.30,filamentRadii[i]))));
    filaments += tint*(core*strength+soft*.045)*gaps*rear;
  }
  return (light*foreground+filaments)*inner*outer;
}

// Flared outer gas and the dark foreground veil contain long, discontinuous
// strands rather than a uniform horizontal sheet. Its light is much weaker
// than the hot inner disc and leaves the distant sky almost black.
vec3 discAtmosphere(vec2 uv) {
  float wings = smoothstep(.29,.49,abs(uv.x));
  if (abs(uv.y)>.28) return vec3(0);
  float warp = fbm(vec2(uv.x*7.0-time*.020,uv.y*43.0+51.2));
  float bend = sin(uv.x*5.1-time*.018)*.005+(warp-.5)*.012;
  float lane = uv.y+bend;
  float upper = exp(-pow((lane-.042)/.068,2.0))*wings;
  float foreground = exp(-pow((lane+.108)/.035,2.0));
  if (upper+foreground<.002) return vec3(0);
  float strand = noise(vec2(uv.x*11.0-time*.042,lane*238.0));
  float patches = fbm(vec2(uv.x*32.0-time*.028,lane*113.0+19.7));
  float density = (pow(strand,2.0)*(.2+patches)*.32+pow(strand,6.0)*.20)
                *smoothstep(.28,.65,patches);
  vec3 light = vec3(.43,.54,.67)*upper*density*.72;
  light += vec3(.95,.84,.73)*foreground*(density*1.30+patches*.025);
  float glints = pow(noise(vec2(uv.x*116.0-time*.22,lane*509.0)),21.0);
  light += vec3(1.0,.90,.75)*glints*(upper+foreground)*.42;
  return light;
}

// The disc is shaded in its own orbital coordinates, not screen-space rings.
// Differential angular speed and several noise scales create shearing gas.
vec4 disc(vec3 p, vec3 velocity, float layer, float textureScale) {
  float r = length(p.xz);
  if (r<2.15 || r>16.0) return vec4(0);
  float a = atan(p.z,p.x);
  float orbital = time*1.45/pow(r,.9);
  float theta = a-orbital;
  // True radial ray differentials supplied by the plane intersection. Their
  // unit is world radius per height-normalized screen coordinate, so existing
  // filters divide by resolution.y to obtain the radial pixel footprint.
  vec2 seed = vec2(layer*17.31,layer*9.73);
  vec2 flow = vec2(r*1.7,theta*4.0+r*.65)+seed;
  float macro = filteredFbm(flow,1.7*textureScale/resolution.y);
  float warp = fbm(vec2(r*.95,theta*3.2-r*.24)+seed);
  float warpedRadius = r + (warp-.5)*.16;
  // Narrow ridges follow long orbital arcs. Independent scales cross and
  // fragment instead of filling the disc with a broad, foamy bright noise.
  float strands = noise(vec2(warpedRadius*11.3,theta*1.7+r*.14)+seed);
  float turbulentBody = filteredFbm(vec2(warpedRadius*6.8,theta*5.0+r*.40)+seed,
                                    6.8*textureScale/resolution.y);
  float thread = noise(vec2(warpedRadius*22.0,theta*4.7+r*.35)+seed);
  float fine = noise(vec2(warpedRadius*34.0,theta*9.0+r*.73)+seed);
  float body = pow(clamp(turbulentBody*1.7-.30,0.0,1.0),2.0);
  float filament = pow(max(1.0-abs(strands*2.0-1.0),0.0),5.0);
  float threadRidge = pow(max(1.0-abs(thread*2.0-1.0),0.0),8.0);
  float fineRidge = pow(max(1.0-abs(fine*2.0-1.0),0.0),10.0);
  body = filteredRidge(body,.349,6.8,textureScale);
  filament = filteredRidge(filament,.256,11.3,textureScale);
  threadRidge = filteredRidge(threadRidge,.175,22.0,textureScale);
  fineRidge = filteredRidge(fineRidge,.144,34.0,textureScale);
  float longStrand = orbitalFilament(warpedRadius,theta,7.3,layer*37.1+3.9,textureScale);
  float secondStrand = orbitalFilament(warpedRadius,theta,11.7,layer*31.7+21.4,textureScale);
  float fineStrand = orbitalFilament(warpedRadius,theta,19.3,layer*47.3+51.8,textureScale);
  float clumps = .25+macro*.85;
  // Faint plunging matter softens the sharp ISCO cut into trailing wisps.
  float edge = smoothstep(2.15,2.94,r);
  float nearSide = smoothstep(-1.0,4.0,p.z);
  float outside = exp(-pow(max(r-mix(7.2,6.0,nearSide),0.0)/mix(3.5,2.7,nearSide),2.0));
  float radial = pow(3.3/max(r,3.3),mix(1.5,2.25,nearSide));
  float heat = exp(-pow((r-3.65)/1.5,2.0));
  vec3 cool = vec3(.43,.50,.60);
  vec3 warm = vec3(1.0,.94,.84);
  vec3 gas = mix(cool,warm,clamp(radial*.76+heat*.18+filament*.35,0.0,1.0));
  // The approaching side is modestly brighter and hotter; no neon colors.
  float doppler = pow(clamp(1.0-.10*p.x/r,.8,1.2),2.2);
  float grazing = clamp(.26/(abs(normalize(velocity).y)+.055),.8,1.72);
  float breaks = .60+.40*smoothstep(.16,.72,macro);
  float detail = (.050+body*.65+longStrand*.50+secondStrand*.35+fineStrand*.20
                 +filament*.55+threadRidge*.42+fineRidge*.18)*clumps*breaks;
  float light = edge*outside*radial*detail*doppler*grazing;
  vec3 emission = gas*light*5.2;
  emission += warm*heat*edge*(.08+.26*macro+.10*longStrand)*doppler;
  float sparks = pow(noise(vec2(r*43.0,theta*67.0+r*3.0)),16.0);
  emission += vec3(1.0,.95,.87)*sparks*radial*outside*edge*1.5;
  float opacity = edge*outside*clamp(.42+macro*.20+nearSide*.30+longStrand*.10,0.0,.97);
  // The raised/lowered strata are cooler, thinner gas above the dense plane.
  emission *= mix(1.0,1.12,abs(layer));
  emission *= mix(vec3(1),vec3(.97,.98,1.02),abs(layer)*.55);
  emission *= 1.0-.24*smoothstep(6.0,14.0,r);
  emission *= 1.0+.60*smoothstep(4.5,9.0,r);
  return vec4(emission,opacity);
}

vec3 acceleration(vec3 p, float angularMomentum2) {
  float r2 = dot(p,p);
  return -1.5*angularMomentum2*p/(r2*r2*sqrt(r2));
}

// Variational Schwarzschild acceleration for one neighbouring null ray.
// The shared centre-ray affine step is held fixed while p and h2 vary.
vec3 accelerationDifferential(vec3 p, vec3 dp, float h2, float dh2) {
  float r2 = dot(p,p);
  float inverseR5 = 1.0/(r2*r2*sqrt(r2));
  return -1.5*inverseR5*(dh2*p+h2*(dp-5.0*p*dot(p,dp)/r2));
}

vec3 normalizedRayDifferential(vec3 velocity, float rawLength, vec3 rawDerivative) {
  return (rawDerivative-velocity*dot(velocity,rawDerivative))/rawLength;
}

// Transported dp values describe equal affine times. Removing the crossing
// time variation projects each differential onto the emitting stratum.
float radialTextureScale(vec3 hit, vec3 hitVelocity, vec3 dpX, vec3 dpY) {
  float safeVy = hitVelocity.y >= 0.0 ? max(hitVelocity.y,.000001)
                                     : min(hitVelocity.y,-.000001);
  vec3 dHitX = dpX-hitVelocity*(dpX.y/safeVy);
  vec3 dHitY = dpY-hitVelocity*(dpY.y/safeVy);
  vec2 radialDirection = hit.xz/max(length(hit.xz),.000001);
  float drX = dot(radialDirection,dHitX.xz);
  float drY = dot(radialDirection,dHitY.xz);
  float scale = abs(drX)+abs(drY);
  // Caustics may amplify a ray differential past floating-point range. At
  // that point all existing high-frequency filters already tend to their mean.
  if (isnan(scale) || isinf(scale)) return 280.0;
  return clamp(scale,.0001,280.0);
}

// Trace just the far-side material for the locally opened rear image. The
// near-side disc retains its original projection and its foreground opacity.
vec3 rearDisc(vec2 projection, vec2 projectionDX, vec2 projectionDY,
              vec3 origin, vec3 forward, vec3 right, vec3 up) {
  vec3 rawVelocity = forward+(projection.x*right+projection.y*up)*.865;
  vec3 velocity = normalize(rawVelocity);
  vec3 dvX = normalizedRayDifferential(velocity,length(rawVelocity),
                    .865*(projectionDX.x*right+projectionDX.y*up));
  vec3 dvY = normalizedRayDifferential(velocity,length(rawVelocity),
                    .865*(projectionDY.x*right+projectionDY.y*up));
  vec3 dpX = vec3(0), dpY = vec3(0);
  vec3 p = origin;
  float h2 = dot(cross(p,velocity),cross(p,velocity));
  vec3 momentum = cross(p,velocity);
  float dh2X = 2.0*dot(momentum,cross(origin,dvX));
  float dh2Y = 2.0*dot(momentum,cross(origin,dvY));
  vec3 color = vec3(0);
  float transmission = 1.0;
  for (int i=0;i<180;i++) {
    float radius = length(p);
    if (radius<1.015 || (radius>28.0 && dot(p,velocity)>0.0)) break;
    float stepSize = clamp(radius*.085,.035,1.25);
    vec3 old = p;
    vec3 oldVelocity = velocity;
    vec3 oldDpX = dpX, oldDpY = dpY;
    vec3 gravity = acceleration(p,h2);
    vec3 dgX = accelerationDifferential(p,dpX,h2,dh2X);
    vec3 dgY = accelerationDifferential(p,dpY,h2,dh2Y);
    p += velocity*stepSize+.5*gravity*stepSize*stepSize;
    dpX += dvX*stepSize+.5*dgX*stepSize*stepSize;
    dpY += dvY*stepSize+.5*dgY*stepSize*stepSize;
    // daNew uses the updated position AND its updated differential.
    vec3 nextDgX = accelerationDifferential(p,dpX,h2,dh2X);
    vec3 nextDgY = accelerationDifferential(p,dpY,h2,dh2Y);
    velocity += .5*(gravity+acceleration(p,h2))*stepSize;
    dvX += .5*(dgX+nextDgX)*stepSize;
    dvY += .5*(dgY+nextDgY)*stepSize;
    for (int stratum=0;stratum<3;stratum++) {
      float layer = float(1-stratum)*(velocity.y<0.0?1.0:-1.0);
      float plane = layer*.045;
      if ((old.y-plane)*(p.y-plane)<0.0) {
        float fraction = (old.y-plane)/(old.y-p.y);
        vec3 hit = mix(old,p,fraction);
        if (hit.z<0.0) {
          vec3 hitDpX = mix(oldDpX,dpX,fraction);
          vec3 hitDpY = mix(oldDpY,dpY,fraction);
          vec3 hitVelocity = mix(oldVelocity,velocity,fraction);
          float textureScale = radialTextureScale(hit,hitVelocity,hitDpX,hitDpY);
          vec4 matter = disc(hit,velocity,layer,textureScale);
          float weight = stratum==1?.50:.25;
          float alpha = 1.0-pow(1.0-matter.a,weight);
          color += transmission*matter.rgb*alpha;
          transmission *= 1.0-alpha;
        }
      }
    }
    if (transmission<.025) break;
  }
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy-.5*resolution)/resolution.y;
  uv.y -= .024;
  // A diffuse outer photosphere makes the secondary image broader. Keep the
  // photon silhouette fixed while spreading only the outer gas projection.
  vec2 lensUV = uv;
  float screenRadius = length(uv);
  float lower = 1.0-smoothstep(-.09,.03,uv.y);
  float outerStart = mix(.200,.245,lower);
  float outerDistance = max(screenRadius-outerStart,0.0);
  float spread = mix(.30,.39,lower);
  float offPlane = smoothstep(.028,.14,abs(uv.y));
  float projectedRadius = screenRadius-spread*outerDistance*offPlane;
  lensUV *= projectedRadius/max(screenRadius,.0001);
  // Match the slightly narrower sides of the upper image without changing
  // the photon shadow, the disc plane, or the independently lensed underside.
  float upperSides = smoothstep(.10,.18,uv.y)
                   *smoothstep(.225,.30,screenRadius);
  lensUV.x *= 1.0+.035*upperSides;
  float angle = atan(uv.y,uv.x);
  float irregularity = (fbm(vec2(screenRadius*71.0,angle*19.0-time*.028))-.5)*.0013;
  lensUV += normalize(uv+vec2(.00001))*irregularity*smoothstep(.204,.24,screenRadius);
  vec3 origin = vec3(pointer.x*.10,1.72+pointer.y*.06,16.0);
  vec3 forward = normalize(-origin);
  vec3 right = normalize(cross(forward,vec3(0,1,0)));
  vec3 up = cross(right,forward);
  vec2 projectionDX = dFdx(lensUV)*resolution.y;
  vec2 projectionDY = dFdy(lensUV)*resolution.y;
  float rearOffset = shoulderOffset(uv);
  vec2 rearUV = lensUV-vec2(sign(uv.x)*rearOffset,0);
  vec2 rearProjectionDX = dFdx(rearUV)*resolution.y;
  vec2 rearProjectionDY = dFdy(rearUV)*resolution.y;
  vec3 rawVelocity = forward+(lensUV.x*right+lensUV.y*up)*.865;
  vec3 velocity = normalize(rawVelocity);
  vec3 dvX = normalizedRayDifferential(velocity,length(rawVelocity),
                    .865*(projectionDX.x*right+projectionDX.y*up));
  vec3 dvY = normalizedRayDifferential(velocity,length(rawVelocity),
                    .865*(projectionDY.x*right+projectionDY.y*up));
  vec3 dpX = vec3(0), dpY = vec3(0);
  vec3 initialDirection = normalize(forward+(uv.x*right+uv.y*up)*.865);
  vec3 p = origin;
  float h2 = dot(cross(p,velocity),cross(p,velocity));
  vec3 momentum = cross(p,velocity);
  float dh2X = 2.0*dot(momentum,cross(origin,dvX));
  float dh2Y = 2.0*dot(momentum,cross(origin,dvY));
  vec3 color = vec3(0);
  vec3 farColor = vec3(0);
  float nearTransmission = 1.0;
  float transmission = 1.0;
  bool captured = false;
  // Velocity Verlet integration of Schwarzschild null-ray curvature.
  // Adaptive distance steps resolve the photon sphere without spending the
  // same work on empty space. Matter can occlude both the sky and lower ring.
  for (int i=0;i<180;i++) {
    float radius = length(p);
    if (radius<1.015) { captured = true; break; }
    if (radius>28.0 && dot(p,velocity)>0.0) break;
    float stepSize = clamp(radius*.085,.035,1.25);
    vec3 old = p;
    vec3 oldVelocity = velocity;
    vec3 oldDpX = dpX, oldDpY = dpY;
    vec3 gravity = acceleration(p,h2);
    vec3 dgX = accelerationDifferential(p,dpX,h2,dh2X);
    vec3 dgY = accelerationDifferential(p,dpY,h2,dh2Y);
    p += velocity*stepSize+.5*gravity*stepSize*stepSize;
    dpX += dvX*stepSize+.5*dgX*stepSize*stepSize;
    dpY += dvY*stepSize+.5*dgY*stepSize*stepSize;
    // daNew uses the updated position AND its updated differential.
    vec3 nextDgX = accelerationDifferential(p,dpX,h2,dh2X);
    vec3 nextDgY = accelerationDifferential(p,dpY,h2,dh2Y);
    velocity += .5*(gravity+acceleration(p,h2))*stepSize;
    dvX += .5*(dgX+nextDgX)*stepSize;
    dvY += .5*(dgY+nextDgY)*stepSize;
    // Three independently textured strata give the thin disc optical depth.
    // Crossings are composited in ray order with conserved total opacity.
    for (int stratum=0;stratum<3;stratum++) {
      float layer = float(1-stratum)*(velocity.y<0.0?1.0:-1.0);
      float plane = layer*.045;
      if ((old.y-plane)*(p.y-plane)<0.0) {
        float fraction = (old.y-plane)/(old.y-p.y);
        vec3 hit = mix(old,p,fraction);
        vec3 hitDpX = mix(oldDpX,dpX,fraction);
        vec3 hitDpY = mix(oldDpY,dpY,fraction);
        vec3 hitVelocity = mix(oldVelocity,velocity,fraction);
        float textureScale = radialTextureScale(hit,hitVelocity,hitDpX,hitDpY);
        vec4 matter = disc(hit,velocity,layer,textureScale);
        float weight = stratum==1?.50:.25;
        float alpha = 1.0-pow(1.0-matter.a,weight);
        vec3 emitted = transmission*matter.rgb*alpha;
        color += emitted;
        if (hit.z<0.0) farColor += emitted;
        else nearTransmission *= 1.0-alpha;
        transmission *= 1.0-alpha;
      }
    }
    if (transmission<.025) break;
  }
  if (rearOffset>.00005) {
    color += rearDisc(rearUV,rearProjectionDX,rearProjectionDY,
                      origin,forward,right,up)*nearTransmission-farColor;
  }
  float upperArch = smoothstep(.03,.13,uv.y)*(1.0-smoothstep(.36,.51,abs(uv.x)));
  float archExposure = .31+.83*exp(-pow((screenRadius-.267)/.045,2.0));
  color *= mix(1.0,archExposure,upperArch);
  float frontBand = exp(-pow((uv.y+.028)/.025,2.0))
                  *(1.0-smoothstep(.45,.68,abs(uv.x)));
  color *= 1.0+.18*frontBand;
  color *= vec3(1.04,1.0,.93);
  if (!captured) {
    float skyBending = 1.0-smoothstep(2.7,4.6,sqrt(h2));
    color += transmission*background(normalize(mix(initialDirection,velocity,skyBending)));
  }
  color += scatteredGas(uv);
  color += discAtmosphere(uv);
  // Warm, optically thin light joins the rear filaments to the foreground.
  // It is confined to the inner shoulders and does not fill the photon shadow.
  float rootGlow = exp(-pow((uv.y-.025)/.037,2.0))
                 *smoothstep(.193,.220,abs(uv.x))
                 *(1.0-smoothstep(.28,.41,abs(uv.x)))
                 *smoothstep(.197,.211,screenRadius);
  float rootDensity = .68+.32*noise(vec2(uv.x*17.0-time*.018,uv.y*93.0));
  color += vec3(1.0,.91,.78)*rootGlow*rootDensity*.28;
  // Forward scattering from the near disc fades into the bottom of the
  // shadow, rather than cutting the bright disc against an absolute black.
  float frontGlow = exp(-pow((uv.y+.022)/.034,2.0))
                  *exp(-pow(abs(uv.x)/.23,4.0));
  float frontDensity = .72+.28*fbm(vec2(uv.x*23.0-time*.035,uv.y*91.0));
  color += vec3(1.0,.87,.71)*frontGlow*frontDensity*.20;
  // Scattered light around the thin hot photon image. Its shape and location
  // are determined by the ray trace above rather than a drawn circular band.
  float impact = sqrt(h2);
  float photonGlow = exp(-pow((impact-2.60)/.10,2.0));
  float photonVisibility = clamp(transmission*1.2,0.0,1.0);
  color += vec3(1.0,.92,.81)*photonGlow*.16*photonVisibility;
  float photonWidth = max(.023,fwidth(impact)*.7);
  color += vec3(1.0,.94,.84)*exp(-pow((impact-2.613)/photonWidth,2.0))*.80*photonVisibility;
  color *= intensity;
  // A gentler shoulder retains differences between hot neighbouring strands.
  vec3 exposed = 1.0-exp(-color*.98);
  vec3 shoulder = color/(1.0+color);
  color = pow(max(mix(exposed,shoulder,.22),vec3(0)),vec3(.94));
  float vignette = 1.0-.16*smoothstep(.3,1.0,length(uv*vec2(.68,1)));
  outColor = vec4(color*vignette,1);
}
