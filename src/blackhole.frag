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

// Low optical-depth light scattered through the extended gas photosphere.
// Drifting continuous density and sparse threads soften the ray images
// without fragmenting the gas into isolated bright knots.
vec3 scatteredGas(vec2 uv, float side) {
  float radius = length(uv);
  if (radius<.20 || radius>.48) return vec3(0);
  float angle = atan(uv.y,uv.x)+side*.17;
  float warp = fbm(vec2(angle*2.4-time*.018,radius*9.0+8.1));
  float r = radius+(warp-.5)*.004;
  float body = fbm(vec2(r*32.0,angle*5.1-time*.035));
  float strand = noise(vec2(r*75.0+warp*1.2,angle*2.0-time*.045));
  float patches = fbm(vec2(angle*4.0-time*.025,r*12.0+27.3));
  float density = (.06+smoothstep(.24,.76,body)*.90+pow(strand,4.0)*.14)
                *(.78+.22*smoothstep(.18,.80,patches));
  float inner = smoothstep(.201,.227,r);
  float outer = 1.0-smoothstep(.37,.46,r);
  float hot = exp(-pow((r-.267)/.035,2.0));
  float haze = exp(-pow((r-.327)/.065,2.0));
  vec3 warm = vec3(1.0,.94,.86);
  vec3 silver = vec3(.45,.51,.60);
  vec3 light = (warm*hot*.22+silver*haze*.18)*density;
  float innerHaze = exp(-pow((r-.216)/.016,2.0))*.06;
  light += warm*innerHaze*(.65+body*.35);
  return light*inner*outer;
}

// Flared outer gas and the dark foreground veil contain long, discontinuous
// strands rather than a uniform horizontal sheet. Its light is much weaker
// than the hot inner disc and leaves the distant sky almost black.
vec3 discAtmosphere(vec2 uv, float side) {
  float wings = smoothstep(.29,.49,abs(uv.x));
  if (abs(uv.y)>.28) return vec3(0);
  float warp = fbm(vec2(uv.x*3.2-time*.020,uv.y*16.0+51.2+side*.3));
  float bend = sin(uv.x*5.1-time*.018)*.002+(warp-.5)*.005;
  float lane = uv.y+bend;
  float upper = exp(-pow((lane-.042)/.068,2.0))*wings;
  float body = fbm(vec2(uv.x*4.2-time*.022,lane*28.0+19.7));
  float macro = fbm(vec2(uv.x*1.8,lane*10.0+31.0));
  float strand = pow(noise(vec2(uv.x*4.0-time*.028,lane*132.0)),5.0);
  float density = (.07+body*.25)*(.65+macro*.35)+strand*.045;
  vec3 light = vec3(.43,.54,.67)*upper*density*.72;
  // A thin near-side stream crosses the shadow. It fades and narrows toward
  // the long wings, rather than becoming a flat, uniformly bright stripe.
  float streamWidth = mix(.009,.004,smoothstep(.3,.9,abs(uv.x)))
                     *(.78+.40*noise(vec2(uv.x*5.0-time*.022,22.7)));
  float nearPlane = exp(-pow(uv.y/streamWidth,2.0));
  float tail = pow(.31/max(abs(uv.x),.31),1.6)
             *exp(-pow(max(abs(uv.x)-.34,0.0)/.72,2.0));
  float stream = fbm(vec2(uv.x*9.0-time*.038,uv.y*88.0+14.2));
  float streamDensity = .18+.82*smoothstep(.22,.77,stream);
  float fineStream = noise(vec2(uv.x*19.0-time*.09,uv.y*185.0+warp*1.4));
  light += vec3(1.0,.94,.86)*nearPlane*tail*(streamDensity+fineStream*.075)*1.65;
  return light;
}

// The disc is shaded in its own orbital coordinates, not screen-space rings.
// Differential angular speed and several noise scales create shearing gas.
vec4 disc(vec3 p, vec3 velocity, float layer, float side) {
  float r = length(p.xz);
  if (r<2.15 || r>22.0) return vec4(0);
  float a = atan(p.z,p.x);
  float orbital = time*1.45/pow(r,.9);
  float theta = a-orbital+side*.22;
  vec2 seed = vec2(layer*1.7,layer*2.3);
  vec2 flow = vec2(r*.72,theta*2.8+r*.10)+seed*.35;
  float macro = fbm(flow);
  float warp = fbm(vec2(r*.60,theta*2.2-r*.14)+seed*.25);
  float warpedRadius = r + (warp-.5)*.35;
  // Narrow ridges follow long orbital arcs. Independent scales cross and
  // fragment instead of filling the disc with a broad, foamy bright noise.
  float strands = noise(vec2(warpedRadius*9.5,theta*1.6+r*.10)+seed);
  float turbulentBody = fbm(vec2(warpedRadius*3.8,theta*5.4+r*.22)+seed);
  float eddies = noise(vec2(warpedRadius*6.5,theta*3.3+r*.26)+seed*.7);
  float thread = noise(vec2(warpedRadius*20.0,theta*2.5+r*.19)+seed);
  float fine = noise(vec2(warpedRadius*34.0,theta*9.0+r*.73)+seed);
  float body = .08+.92*smoothstep(.28,.78,turbulentBody);
  float filament = pow(max(1.0-abs(strands*2.0-1.0),0.0),4.0);
  float threadRidge = pow(max(1.0-abs(thread*2.0-1.0),0.0),6.0);
  float fineRidge = pow(max(1.0-abs(fine*2.0-1.0),0.0),8.0);
  float clumps = .30+.70*smoothstep(.23,.77,macro);
  // Faint plunging matter softens the sharp ISCO cut into trailing wisps.
  float edge = smoothstep(2.15,2.94,r);
  float nearSide = smoothstep(-1.0,4.0,p.z);
  // A wider radial tail carries the distant disc farther into both wings.
  // It stays optically thin and fades before the ray-integration boundary.
  float outside = exp(-pow(max(r-mix(7.2,6.0,nearSide),0.0)/mix(5.2,4.0,nearSide),2.0))
                * (1.0-smoothstep(18.0,22.0,r));
  float radial = pow(3.3/max(r,3.3),mix(1.5,2.25,nearSide));
  float heat = exp(-pow((r-3.65)/1.5,2.0));
  vec3 cool = vec3(.43,.50,.60);
  vec3 warm = vec3(1.0,.94,.87);
  vec3 gas = mix(cool,warm,clamp(radial*.76+macro*.09,0.0,1.0));
  // The approaching side is modestly brighter and hotter; no neon colors.
  float doppler = pow(clamp(1.0-.10*p.x/r,.8,1.2),2.2);
  float grazing = clamp(.26/(abs(normalize(velocity).y)+.055),.8,1.72);
  float detail = (body*.85+pow(eddies,1.5)*.40+filament*.18+threadRidge*.070+fineRidge*.025)*clumps;
  float light = edge*outside*radial*detail*doppler*grazing;
  vec3 emission = gas*light*3.5;
  emission += warm*heat*edge*(.045+.15*macro)*doppler;
  float opacity = edge*outside*(.64+macro*.15);
  // The raised/lowered strata are cooler, thinner gas above the dense plane.
  emission *= mix(vec3(1),vec3(.86,.94,1.05),abs(layer)*.55);
  emission *= 1.0-.24*smoothstep(6.0,14.0,r);
  return vec4(emission,opacity);
}

vec3 acceleration(vec3 p, float angularMomentum2) {
  float r2 = dot(p,p);
  return -1.5*angularMomentum2*p/(r2*r2*sqrt(r2));
}

void main() {
  vec2 uv = (gl_FragCoord.xy-.5*resolution)/resolution.y;
  // Match the upper/lower envelopes around the screen centre. Their gas
  // phases remain distinct, and the distant sky is never mirrored.
  vec2 sceneUV = vec2(uv.x,abs(uv.y));
  float side = uv.y/(abs(uv.y)+.020);
  // A concave flare turns each arch smoothly into the horizontal disc.
  // The lateral derivative stays below one, so this cannot fold into a
  // second bright ridge. The central photon silhouette remains circular.
  float flare = .095*(1.0-pow(clamp(sceneUV.y/.19,0.0,1.0),.45));
  float flareWeight = smoothstep(.21,.41,abs(sceneUV.x));
  vec2 gasUV = sceneUV;
  gasUV.x -= sign(gasUV.x)*flare*flareWeight;
  // A diffuse outer photosphere makes the secondary image broader. Keep the
  // photon silhouette fixed while spreading only the outer gas projection.
  vec2 lensUV = gasUV;
  float screenRadius = length(gasUV);
  float outerStart = .200;
  float outerDistance = max(screenRadius-outerStart,0.0);
  float spread = .30;
  // Let the outer photosphere taper into the disc instead of piling up at
  // its two shoulders. This fades smoothly; the photon rim is untouched.
  float junction = exp(-pow((abs(sceneUV.x)-.29)/.105,2.0))
                 * exp(-pow((sceneUV.y-.065)/.080,2.0))
                 * smoothstep(-.012,.020,sceneUV.y);
  spread *= 1.0-.55*junction;
  float offPlane = smoothstep(.010,.170,sceneUV.y);
  float projectedRadius = screenRadius-spread*outerDistance*offPlane;
  lensUV *= projectedRadius/max(screenRadius,.0001);
  float angle = atan(gasUV.y,gasUV.x);
  float irregularity = (fbm(vec2(screenRadius*24.0,angle*6.0-time*.028+side*.17))-.5)*.0006;
  lensUV += normalize(gasUV+vec2(.00001))*irregularity*smoothstep(.204,.24,screenRadius);
  vec3 origin = vec3(pointer.x*.10,1.72+pointer.y*.06,16.0);
  vec3 forward = normalize(-origin);
  vec3 right = normalize(cross(forward,vec3(0,1,0)));
  vec3 up = cross(right,forward);
  vec3 velocity = normalize(forward+(lensUV.x*right+lensUV.y*up)*.865);
  vec3 initialDirection = normalize(forward+(uv.x*right+uv.y*up)*.865);
  vec3 photonDirection = normalize(forward+(sceneUV.x*right+sceneUV.y*up)*.865);
  float impact = length(cross(origin,photonDirection));
  vec3 p = origin;
  float h2 = dot(cross(p,velocity),cross(p,velocity));
  vec3 color = vec3(0);
  float transmission = 1.0;
  // Velocity Verlet integration of Schwarzschild null-ray curvature.
  // Adaptive distance steps resolve the photon sphere without spending the
  // same work on empty space. Matter can occlude both the sky and lower ring.
  for (int i=0;i<180;i++) {
    float radius = length(p);
    if (radius<1.015) break;
    if (radius>28.0 && dot(p,velocity)>0.0) break;
    float stepSize = clamp(radius*.085,.035,1.25);
    vec3 old = p;
    vec3 gravity = acceleration(p,h2);
    p += velocity*stepSize+.5*gravity*stepSize*stepSize;
    velocity += .5*(gravity+acceleration(p,h2))*stepSize;
    // Three correlated strata give the thin disc optical depth.
    // Crossings are composited in ray order with conserved total opacity.
    for (int stratum=0;stratum<3;stratum++) {
      float layer = float(1-stratum)*(velocity.y<0.0?1.0:-1.0);
      float plane = layer*.045;
      if ((old.y-plane)*(p.y-plane)<0.0) {
        float fraction = (old.y-plane)/(old.y-p.y);
        vec3 hit = mix(old,p,fraction);
        vec4 matter = disc(hit,velocity,layer,side);
        float weight = stratum==1?.50:.25;
        float alpha = 1.0-pow(1.0-matter.a,weight);
        color += transmission*matter.rgb*alpha;
        transmission *= 1.0-alpha;
      }
    }
    if (transmission<.025) break;
  }
  float upperArch = smoothstep(.015,.105,sceneUV.y)*(1.0-smoothstep(.36,.51,abs(gasUV.x)));
  // At the join, keep a bright narrow stream and let its cooler outskirts
  // recede. Smooth coverage avoids a seam between the arch and plane.
  float archWidth = mix(.045,.026,junction);
  float archCenter = .267-.010*junction;
  float archExposure = mix(.31,.14,junction)
                     +mix(.83,.98,junction)*exp(-pow((screenRadius-archCenter)/archWidth,2.0));
  upperArch = 1.0-(1.0-upperArch)*(1.0-junction*.82);
  color *= mix(1.0,archExposure,upperArch);
  // A drifting, continuous optical-depth field breaks up overly regular
  // bands into translucent plumes. It never carves hard holes in the gas.
  float plumeWarp = fbm(vec2(screenRadius*13.0,angle*4.2-time*.022+side*.31));
  float plume = fbm(vec2(screenRadius*31.0,angle*8.0-time*.036+side*.51)
                   +vec2(plumeWarp*2.7,plumeWarp*.7));
  color *= mix(1.0,.26+smoothstep(.23,.76,plume),.38);
  float shadowMask = smoothstep(2.595,2.62,impact);
  color *= shadowMask;
  if (impact>2.595) {
    float skyBending = 1.0-smoothstep(2.7,4.6,sqrt(h2));
    vec3 skyRay = velocity;
    if (uv.y<0.0) skyRay.y = -skyRay.y;
    color += transmission*background(normalize(mix(initialDirection,skyRay,skyBending)))*shadowMask;
  }
  color += scatteredGas(gasUV,side)*(1.0-.35*junction)*shadowMask;
  color += discAtmosphere(sceneUV,side);
  // Keep the critical-impact photon image independent of the gas flare and
  // its deliberately symmetric envelope, so the central silhouette is round.
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
