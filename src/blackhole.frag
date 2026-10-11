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
  col += vec3(.18,.26,.36)*pow(cloud,3.0)*dust*milky*1.10;
  float mist = max(fbm(sky*6.2+vec2(9.2,17.1))*fbm(sky*37.0)-.19,0.0);
  col += vec3(.17,.23,.31)*mist*milky*1.10;
  col += vec3(.10,.15,.21)*pow(max(cloud-.38,0.0)*1.6,3.0)*dust*.80;
  // Broken distant dust stays below the bright stars, with dark holes between
  // clouds. There is no uniform raised black floor around the silhouette.
  float remoteDust = pow(max(fbm(sky*5.7+13.3)-.34,0.0)*1.7,2.0)
                   *smoothstep(.24,.66,fbm(sky*18.0+31.7));
  col += vec3(.055,.080,.120)*remoteDust*1.1;
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
    float phase = hash(vec2(lane+39.7,seed+91.1))*2.0*PI;
    float width = (.035+.145*hash(vec2(lane+13.7,seed+4.3)))
                 *(.80+.20*sin(theta*2.0+phase));
    float filteredWidth = sqrt(width*width+footprint*footprint/6.0);
    float turn = 2.0+floor(hash(vec2(lane+5.3,seed+11.9))*4.0);
    float bend = .12*sin(theta*turn+phase+radius*.13)
               +.07*sin(theta*(turn+3.0)-phase*1.9-radius*.20);
    float distance = coordinate-lane-center-bend;
    float core = exp(-pow(distance/filteredWidth,2.0))*width/filteredWidth;
    vec2 densityOffset = hash2(vec2(lane,seed+17.9))*43.0;
    float density = noise(orbit+densityOffset);
    // Most gas strands remain dim; isolated hot streams carry the highlights.
    float brightness = .02+6.0*pow(hash(vec2(lane+73.1,seed+31.7)),6.0);
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
  float hot = exp(-pow((r-hotRadius)/mix(.030,.034,lower),2.0));
  float haze = exp(-pow((r-mix(.332,.336,lower))/.073,2.0));
  float foreground = mix(1.0,smoothstep(.12,.195,-uv.y),lower);
  vec3 warm = vec3(1.0,.975,.935);
  vec3 silver = vec3(.45,.51,.60);
  vec3 light = warm*hot*mix(.95,1.55,lower)+silver*haze*mix(.24,.46,lower);
  float knots = pow(noise(vec2(r*431.0,angle*89.0-time*.14)),15.0);
  light *= threads;
  light += vec3(1.0,.85,.65)*knots*haze*.45;
  float innerHaze = exp(-pow((r-.228)/.026,2.0))*.28;
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

// Resolved extinction in the dilute photosphere adds fine, drifting openings
// after the dense disc has been integrated along a ray. A single Cartesian
// density field avoids rows of knots at polar coordinate intersections.
float photosphereTransmission(vec2 uv) {
  float radius = length(uv);
  float phase = (time+24.0)*.10/pow(max(radius,.22)/.27,.7);
  vec2 flow = vec2(cos(phase)*uv.x+sin(phase)*uv.y,
                  -sin(phase)*uv.x+cos(phase)*uv.y);
  vec2 displacement = vec2(noise(flow*19.0+17.3),
                            noise(flow*23.0+41.7))-.5;
  vec2 gasPosition = flow*145.0+displacement*3.5;
  float footprint = length(dFdx(gasPosition))+length(dFdy(gasPosition));
  float gas = filteredFbm(gasPosition,footprint);
  float ringMask = smoothstep(.208,.232,radius)
                 *(1.0-smoothstep(.37,.48,radius))
                 *smoothstep(.07,.17,abs(uv.y));
  float planeMask = exp(-pow(uv.y/.105,4.0))
                  *smoothstep(.22,.36,abs(uv.x));
  float density = smoothstep(.20,.80,gas);
  float dust = smoothstep(.40,.70,1.0-density);
  float transmission = (.28+1.80*pow(density,1.35))*exp(-dust*.35);
  return mix(1.0,transmission,clamp(ringMask+planeMask,0.0,1.0)*.24);
}

// The disc is shaded in its own orbital coordinates, not screen-space rings.
// Differential angular speed and several noise scales create shearing gas.
vec4 disc(vec3 p, vec3 velocity, float layer, vec4 rayDifferentials) {
  float r = length(p.xz);
  if (r<2.15 || r>16.0) return vec4(0);

  float angle = atan(p.z,p.x);
  float orbitalRate = 1.45/pow(r,.9);
  float theta = angle-time*orbitalRate;
  vec2 orbit = vec2(cos(theta),sin(theta));
  vec2 radialDifferential = rayDifferentials.xy/resolution.y;
  vec2 angularDifferential = rayDifferentials.zw/resolution.y
                           +time*.9*orbitalRate/r*radialDifferential;
  float textureScale = abs(rayDifferentials.x)+abs(rayDifferentials.y);
  float footprint = textureScale/resolution.y;
  vec2 tangent = vec2(-orbit.y,orbit.x);
  vec2 flowDX = orbit*radialDifferential.x+r*tangent*angularDifferential.x;
  vec2 flowDY = orbit*radialDifferential.y+r*tangent*angularDifferential.y;
  float flowFootprint = length(flowDX)+length(flowDY);
  // This derivative increases with elapsed differential rotation; motion is
  // advection of material, not an unrelated noise seed changed each frame.
  float shear = 1.0+min(time*.9*orbitalRate/max(r,2.15),2.0);
  float depth = abs(layer);

  // Low radial frequency keeps large clouds RESOLVED in the grazing image.
  // A periodic orbit domain prevents a seam where atan wraps. All strata see
  // the same large cloud; their heights only add small depth displacements.
  vec2 cloudPosition = orbit*3.2+vec2(r*.07,r*.04)+vec2(5.1,9.3);
  float cloudFootprint = .10*footprint
                        +3.2*(abs(angularDifferential.x)+abs(angularDifferential.y));
  float cloud = filteredFbm(cloudPosition+layer*vec2(.055,-.035),
                            cloudFootprint);
  float density = smoothstep(.25,.72,cloud);
  float depthCloud = noise(cloudPosition*1.27+vec2(layer*.10,8.7));

  // Coherent shearing bends, shared between layers, give long strands a
  // changing local separation. The outer strata drift by a fraction of one
  // lane instead of becoming unrelated overlaid noise sheets.
  vec2 bendPosition = orbit*(2.1+r*.09)+vec2(r*.83,15.7);
  float bend = filteredFbm(bendPosition+layer*vec2(.09,.06),
                           .96*footprint*shear);
  float warpedRadius = r+(bend-.5)*.21+layer*(depthCloud-.5)*.035;
  float strandTheta = theta+(cloud-.5)*.055+layer*.014;

  float primary = orbitalFilament(warpedRadius,strandTheta,7.3,
                                  3.9+layer*19.7,textureScale);

  // Continuous gas carries most of the light. A gently curled two-dimensional
  // field gives the clouds changing widths and openings, rather than relying
  // on a stack of one-dimensional bright contour lines.
  vec2 flowPosition = orbit*warpedRadius;
  vec2 curl = vec2(noise(flowPosition*.37+17.3),
                   noise(flowPosition*.43+41.7))-.5;
  vec2 gasPosition = flowPosition*2.20+curl*.85+layer*vec2(.04,.07);
  float plume = filteredFbm(gasPosition,2.20*flowFootprint*1.30);
  vec2 finePosition = mat2(.80,.60,-.60,.80)*gasPosition*2.15+vec2(19.7,8.3);
  float finePlume = filteredFbm(finePosition,4.730*flowFootprint*1.30);
  float gasDensity = smoothstep(.23,.77,plume*.72+finePlume*.28);

  // Anisotropic ridges add interrupted wisps between the long streams. The
  // angular coordinates are periodic and vary much slower than radius.
  vec2 fineSeed = vec2(layer*.13,layer*.21);
  float filamentNoise = noise(vec2(warpedRadius*12.4+orbit.x*.65,
                                  orbit.y*2.2+r*.12)+fineSeed);
  float microNoise = noise(vec2(warpedRadius*27.0+orbit.y*.9,
                               orbit.x*3.4+r*.25)+fineSeed*1.7);
  float filament = pow(max(1.0-abs(filamentNoise*2.0-1.0),0.0),6.0);
  float micro = pow(max(1.0-abs(microNoise*2.0-1.0),0.0),9.0);
  filament = filteredRidge(filament,.222,12.4,textureScale);
  micro = filteredRidge(micro,.158,27.0,textureScale);

  // Retain the established physical support and projection-dependent fading.
  float edge = smoothstep(2.15,2.94,r);
  float nearSide = smoothstep(-1.0,4.0,p.z);
  float outside = exp(-pow(max(r-mix(7.2,6.0,nearSide),0.0)
                          /mix(3.5,2.7,nearSide),2.0));
  float radial = pow(3.3/max(r,3.3),mix(1.5,2.25,nearSide));
  float heat = exp(-pow((r-3.65)/1.05,2.0));
  float doppler = pow(clamp(1.0-.10*p.x/r,.8,1.2),2.2);
  float grazing = clamp(.26/(abs(normalize(velocity).y)+.055),.8,1.72);
  float support = edge*outside*radial*doppler*grazing;

  // Unresolved fibres retain their energy but remain modulated by a resolved
  // cloud. Their integrated mean therefore cannot become a uniform beige bar.
  float streamCloud = .08+.92*density;
  float streamModulation = .64+.72*depthCloud;
  float hotStreams = (primary*.25+filament*.12+micro*.04)
                    *streamCloud*streamModulation;
  float wispFootprint = 6.8*footprint
                       +5.0*(abs(angularDifferential.x)+abs(angularDifferential.y));
  float wispDensity = filteredFbm(vec2(warpedRadius*6.8,theta*5.0+r*.40)
                                  +layer*vec2(.17,.19),wispFootprint);
  float wisps = pow(clamp(wispDensity*1.7-.30,0.0,1.0),2.0);
  float body = (.018+wisps*.30+pow(gasDensity,2.1)*.65)*(.24+.76*density);
  float shock = smoothstep(.39,.71,cloud+depthCloud*.08);

  vec3 cool = vec3(.43,.46,.50);
  vec3 neutral = vec3(.67,.69,.72);
  vec3 bodyTint = mix(cool,neutral,clamp(radial*.27+heat*.13,0.0,.40));
  bodyTint = mix(bodyTint,vec3(1.0,.985,.96),
                 clamp(heat*.28+radial*.20,0.0,.65));
  vec3 incandescent = mix(vec3(.57,.60,.65),vec3(1.0,.985,.96),
                          clamp(heat*.42+radial*.70,0.0,1.0));
  // The hot core is carried by sparse streams. Its continuum is weaker
  // than the cooler cloud body, so dense orbital phases retain dark channels.
  vec3 emission = bodyTint*body*support*mix(3.6,1.4,heat);
  emission += incandescent*hotStreams*support*(6.0+heat*1.4);
  // Gentle thermal diffusion belongs to hot, dense gas rather than the entire
  // disc. Dark low-density interstices remain dark between luminous streams.
  emission += incandescent*heat*edge*outside*density*shock*.10*doppler;

  // Dust follows the same clouds and removes local light. Cooler strata carry
  // slightly more dust, creating a true depth difference at the same location.
  float dustShape = noise(cloudPosition*1.37+vec2(19.4,3.1));
  float dust = density*smoothstep(.38,.76,dustShape)
             *(1.0-.44*shock*heat);
  float opticalDepth = edge*outside*dust*(.40+.58*nearSide)*(1.0+depth*.17);
  vec3 localTransmission = exp(-opticalDepth*vec3(1.08,1.0,.91));
  emission *= localTransmission;

  float opacity = edge*outside*clamp(.20+density*.18
                                     +gasDensity*.34
                                     +nearSide*.28
                                     +hotStreams*.055,0.0,.95);
  opacity = 1.0-(1.0-opacity)*exp(-opticalDepth);
  // The plane contains the hottest material; the thin raised gas scatters
  // less light and is cooler, without obliterating the shared cloud gaps.
  emission *= mix(1.0,.68,depth);
  emission *= mix(vec3(1),vec3(.89,.96,1.03),depth*.50);
  emission *= 1.0-.24*smoothstep(6.0,14.0,r);
  emission *= 1.0+1.60*smoothstep(4.5,9.0,r);
  emission *= 3.0;
  return vec4(emission,clamp(opacity,0.0,.97));
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
vec4 discRayDifferentials(vec3 hit, vec3 hitVelocity, vec3 dpX, vec3 dpY) {
  float safeVy = hitVelocity.y >= 0.0 ? max(hitVelocity.y,.000001)
                                     : min(hitVelocity.y,-.000001);
  vec3 dHitX = dpX-hitVelocity*(dpX.y/safeVy);
  vec3 dHitY = dpY-hitVelocity*(dpY.y/safeVy);
  vec2 radialDirection = hit.xz/max(length(hit.xz),.000001);
  float drX = dot(radialDirection,dHitX.xz);
  float drY = dot(radialDirection,dHitY.xz);
  float radius2 = max(dot(hit.xz,hit.xz),.000001);
  float daX = (hit.x*dHitX.z-hit.z*dHitX.x)/radius2;
  float daY = (hit.x*dHitY.z-hit.z*dHitY.x)/radius2;
  // Caustics may amplify a ray differential past floating-point range. At
  // that point all existing high-frequency filters already tend to their mean.
  vec4 differential = vec4(drX,drY,daX,daY);
  if (any(isnan(differential)) || any(isinf(differential))) return vec4(140.0);
  differential.xy *= min(1.0,280.0/max(abs(drX)+abs(drY),.0001));
  return clamp(differential,vec4(-280.0),vec4(280.0));
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
          vec4 rayDifferentials = discRayDifferentials(hit,hitVelocity,hitDpX,hitDpY);
          vec4 matter = disc(hit,velocity,layer,rayDifferentials);
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
  // Evaluate screen derivatives before divergent ray integration.
  float photosphere = photosphereTransmission(uv);
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
        vec4 rayDifferentials = discRayDifferentials(hit,hitVelocity,hitDpX,hitDpY);
        vec4 matter = disc(hit,velocity,layer,rayDifferentials);
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
  float archExposure = .35+1.30*exp(-pow((screenRadius-.273)/.024,2.0));
  color *= mix(1.0,archExposure,upperArch);
  float frontBand = exp(-pow((uv.y+.028)/.025,2.0))
                  *(1.0-smoothstep(.45,.68,abs(uv.x)));
  color *= 1.0+.18*frontBand;
  color *= vec3(1.015,1.0,.985);
  color += scatteredGas(uv);
  color += discAtmosphere(uv);
  // Warm, optically thin light joins the rear filaments to the foreground.
  // It is confined to the inner shoulders and does not fill the photon shadow.
  float rootGlow = exp(-pow((uv.y-.025)/.037,2.0))
                 *smoothstep(.193,.220,abs(uv.x))
                 *(1.0-smoothstep(.28,.41,abs(uv.x)))
                 *smoothstep(.197,.211,screenRadius);
  float rootDensity = .28+.72*noise(vec2(uv.x*17.0-time*.06,uv.y*93.0));
  color += vec3(1.0,.95,.86)*rootGlow*rootDensity*.24;
  // Forward scattering from the near disc fades into the bottom of the
  // shadow, rather than cutting the bright disc against an absolute black.
  float frontGlow = exp(-pow((uv.y+.022)/.034,2.0))
                  *exp(-pow(abs(uv.x)/.23,4.0));
  float frontDensity = .24+.76*fbm(vec2(uv.x*23.0-time*.09,uv.y*91.0));
  color += vec3(1.0,.94,.83)*frontGlow*frontDensity*.16;
  color *= photosphere;
  // Compress only dense gas radiance above the resolved midtones. The smooth
  // shoulder keeps neighbouring hot fibres distinguishable at bright orbital
  // phases; sky light and the photon edge are added after this exposure step.
  float gasLuminance = dot(color,vec3(.2126,.7152,.0722));
  color /= 1.0+.16*max(gasLuminance-2.0,0.0);
  if (!captured) {
    float skyBending = 1.0-smoothstep(2.7,4.6,sqrt(h2));
    color += transmission*background(normalize(mix(initialDirection,velocity,skyBending)));
  }
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
