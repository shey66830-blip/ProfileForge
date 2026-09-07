// ProfileForge Recommendation Engine
import Course from "../models/Course.js";
import Certification from "../models/Certification.js";

export async function getRecommendations(missingSkills=[],matchedSkills=[],options={}){
  const{limit=8,category=null}=options;
  if(missingSkills.length===0){
  const pop=await Course.find({isActive:true}).sort({rating:-1}).limit(6).lean();
  const topCerts=await Certification.find({isActive:true}).limit(4).lean();
  return{courses:pop.map(c=>({...c,coveredSkills:[],relevanceScore:0,popular:true})),certifications:topCerts,learningPath:null,isEmpty:true};
}
  const ml=missingSkills.map(s=>s.toLowerCase());
  const cq={isActive:true};
  if(category)cq.category=category;
  const allCourses=await Course.find(cq).lean();
  const scored=allCourses.map(c=>{
    const cs=(c.skills||[]).map(s=>s.toLowerCase());
    const covered=ml.filter(m=>cs.some(x=>x.includes(m)||m.includes(x)));
    const score=covered.length>0?(covered.length/ml.length)*60+(c.rating/5)*25+pw(c.provider)*15:0;
    return{...c,coveredSkills:covered,relevanceScore:score};
  });
  const top=scored.filter(c=>c.relevanceScore>0).sort((a,b)=>b.relevanceScore-a.relevanceScore).slice(0,limit);
  const allCerts=await Certification.find({isActive:true}).lean();
  const scoredC=allCerts.map(c=>{
    const cs=(c.skills||[]).map(s=>s.toLowerCase());
    const covered=ml.filter(m=>cs.some(x=>x.includes(m)||m.includes(x)));
    const score=covered.length>0?(covered.length/ml.length)*70+(c.validityMonths>0?30:15):0;
    return{...c,coveredSkills:covered,relevanceScore:score};
  });
  const topC=scoredC.filter(c=>c.relevanceScore>0).sort((a,b)=>b.relevanceScore-a.relevanceScore).slice(0,6);
  const lp=buildPath(top,topC,ml);
  return{courses:top,certifications:topC,learningPath:lp};
}

function buildPath(courses,certs,ms){
  if(!courses.length&&!certs.length)return null;
  const steps=[];let sk=[...ms],cost=0,weeks=0;
  for(const c of courses.slice(0,5)){
    if(!sk.length)break;
    const nc=c.coveredSkills.filter(s=>sk.includes(s));
    if(!nc.length)continue;
    sk=sk.filter(s=>!nc.includes(s));
    const w=parseW(c.duration);
    steps.push({type:"course",id:c._id,title:c.title,provider:c.provider,skill:nc.join(", "),duration:c.duration,weeks:w,price:c.price?.amount||0,currency:c.price?.currency||"INR",priority:steps.length+1});
    cost+=c.price?.amount||0;weeks+=w;
  }
  for(const c of certs.slice(0,3)){
    const rc=c.coveredSkills.filter(s=>ms.includes(s));
    if(!rc.length)continue;
    steps.push({type:"certification",id:c._id,title:c.name,provider:c.provider,skill:rc.join(", "),duration:"Exam ("+c.validityMonths+"mo)",weeks:2,price:c.examFee?.amount||0,currency:c.examFee?.currency||"USD",priority:steps.length+1});
    cost+=c.examFee?.amount||0;weeks+=2;
  }
  if(!steps.length)return null;
  return{title:"Become Job-Ready "+cap(ms[0]||"Software Development")+" Developer",steps,estimatedWeeks:weeks,totalCost:cost,skillsCovered:ms.filter(s=>steps.some(st=>st.skill.toLowerCase().includes(s))),skillsRemaining:sk};
}

function pw(p){const w={Scaler:0.9,Coursera:0.85,edX:0.8,"LinkedIn Learning":0.75,Udemy:0.7,"PW Skills":0.7,HackerRank:0.65,freeCodeCamp:0.6,ProfileForge:0.5};return w[p]||0.5;}
function parseW(d){if(!d)return 4;const l=d.toLowerCase();const h=l.match(/(d+)s*hour/);if(h)return Math.max(1,Math.ceil(parseInt(h[1])/10));const w=l.match(/(d+)s*week/);if(w)return parseInt(w[1]);const m=l.match(/(d+)s*month/);if(m)return parseInt(m[1])*4;return 4;}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}


// =============================================
// Legacy Job Recommendation Engine
// Used by jobService.js for per-job recommendations
// =============================================
export function jobRecommendationEngine({ resume = {}, match = {} }) {
  const recommendations = [];
  const improvements = [];
  const warnings = [];

  if (match.overall >= 85) recommendations.push("Excellent match. Highly recommended to apply.");
  else if (match.overall >= 70) recommendations.push("Strong match. Applying is recommended.");
  else if (match.overall >= 55) recommendations.push("Moderate match. Improve a few areas before applying.");
  else warnings.push("Low resume compatibility with this opportunity.");

  if (match.missingSkills?.length) improvements.push("Learn: " + match.missingSkills.join(", "));
  if (match.atsScore < 70) improvements.push("Improve ATS score by adding more measurable achievements, projects and relevant keywords.");
  if (match.educationMatch < 70) improvements.push("Your education does not fully match the preferred qualification.");
  if (match.experienceMatch < 70) improvements.push("Gain internships, freelance work or relevant projects.");
  if (match.skillMatch < 70) improvements.push("Develop more domain-specific technical skills.");
  if (match.locationMatch < 100) recommendations.push("Consider relocating or searching in nearby cities/countries.");

  let careerAdvice = "Continue improving your profile and apply consistently.";
  if (match.overall >= 80) careerAdvice = "You are ready for competitive applications.";
  else if (match.overall < 50) careerAdvice = "Focus on skill building before applying widely.";

  const certs = [];
  const domains = resume.careerDomains || [];
  if (domains.some(d => d.toLowerCase().includes("software"))) certs.push("AWS Cloud Practitioner", "Google Associate Cloud Engineer", "Meta Front-End Certificate");
  if (domains.some(d => d.toLowerCase().includes("artificial") || d.toLowerCase().includes("data"))) certs.push("Google AI", "TensorFlow Developer", "DeepLearning.AI");
  if (domains.some(d => d.toLowerCase().includes("design"))) certs.push("Google UX Design", "Figma Certification");
  if (certs.length === 0) certs.push("AWS Cloud Practitioner", "Google Associate Cloud Engineer");

  return {
    recommendationLevel: match.overall >= 85 ? "Excellent" : match.overall >= 70 ? "Good" : match.overall >= 55 ? "Average" : "Low",
    recommendations,
    improvements,
    warnings,
    careerAdvice,
    suggestedCertifications: [...new Set(certs)],
    suggestedCountries: ["India", "Germany", "Canada", "Singapore", "United States"],
    suggestedCompanies: ["Google", "Microsoft", "Amazon", "TCS", "Infosys", "Accenture"]
  };
}

// Legacy default: used by jobService.js as recommendationEngine({resume, match})
export default function recommendationEngine(args) {
  return jobRecommendationEngine(args);
}

