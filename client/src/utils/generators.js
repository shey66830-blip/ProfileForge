export const TEMPLATES = [
  { id: "modern", label: "Modern", description: "Clean, sectioned layout with strong headings" },
  { id: "classic", label: "Classic", description: "Traditional format with full paragraphs" },
  { id: "minimal", label: "Minimal", description: "Compact, ATS-friendly plain text" },
  { id: "executive", label: "Executive", description: "Leadership-first layout for senior profiles" },
  { id: "technical", label: "Technical", description: "Skills-first layout with projects & certifications" },
];

export function generateDocumentText(type, data, template = "modern") {
  if (type === "biodata") return generateBiodata(data);
  if (type === "cv") return generateCV(data, template);
  return generateResume(data, template);
}

function section(title, content) {
  return content && content.trim() ? `\n${title}\n${content.trim()}` : "";
}

function generateResume(data, template) {
  const summary = data.summary || "Motivated professional with strong learning ability and practical project experience.";
  const experience = data.experience || "Add your internship, work, or volunteering experience here.";
  const projects = data.projects || "Add projects here.";
  const certs = data.certifications || "";
  const personal = data.personalDetails || "";

  if (template === "classic") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nPROFESSIONAL SUMMARY\n${summary}\n\nEDUCATION\n${data.education}\n\nTECHNICAL SKILLS\n${data.skills}\n\nWORK EXPERIENCE\n${experience}\n\nKEY PROJECTS\n${projects}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  if (template === "minimal") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nSummary: ${summary}\nSkills: ${data.skills}\nEducation: ${data.education}\nExperience: ${experience}\nProjects: ${projects}` +
      section("Certifications", certs) +
      section("Personal Details", personal);
  }

  if (template === "executive") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nEXECUTIVE SUMMARY\n${summary}\n\nPROFESSIONAL EXPERIENCE\n${experience}\n\nKEY PROJECTS\n${projects}\n\nEDUCATION\n${data.education}\n\nSKILLS & EXPERTISE\n${data.skills}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  if (template === "technical") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nTECHNICAL SKILLS\n${data.skills}\n\nPROJECTS\n${projects}\n\nEXPERIENCE\n${experience}\n\nEDUCATION\n${data.education}\n\nPROFESSIONAL SUMMARY\n${summary}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  // Modern (default)
  return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nPROFESSIONAL SUMMARY\n${summary}\n\nSKILLS\n${data.skills}\n\nEDUCATION\n${data.education}\n\nEXPERIENCE\n${experience}\n\nPROJECTS\n${projects}` +
    section("CERTIFICATIONS", certs) +
    section("PERSONAL DETAILS", personal);
}

function generateCV(data, template) {
  const summary = data.summary || "Focused learner with interest in academics, projects, and professional development.";
  const projects = data.projects || "Add academic projects or research work here.";
  const experience = data.experience || "Add internships, training, workshops, or achievements here.";
  const certs = data.certifications || "";
  const personal = data.personalDetails || "";

  if (template === "classic") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nACADEMIC PROFILE\n${summary}\n\nEDUCATION\n${data.education}\n\nRESEARCH & PROJECTS\n${projects}\n\nSKILLS & COMPETENCIES\n${data.skills}\n\nEXPERIENCE & TRAINING\n${experience}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  if (template === "minimal") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nProfile: ${summary}\nEducation: ${data.education}\nSkills: ${data.skills}\nProjects: ${projects}\nExperience: ${experience}` +
      section("Certifications", certs) +
      section("Personal Details", personal);
  }

  if (template === "executive") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nPROFESSIONAL PROFILE\n${summary}\n\nCAREER EXPERIENCE\n${experience}\n\nEDUCATION\n${data.education}\n\nSKILLS & COMPETENCIES\n${data.skills}\n\nRESEARCH & PROJECTS\n${projects}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  if (template === "technical") {
    return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nTECHNICAL SKILLS\n${data.skills}\n\nPROJECTS / RESEARCH\n${projects}\n\nEXPERIENCE & TRAINING\n${experience}\n\nEDUCATION\n${data.education}\n\nACADEMIC PROFILE\n${summary}` +
      section("CERTIFICATIONS", certs) +
      section("PERSONAL DETAILS", personal);
  }

  // Modern (default)
  return `${data.name}\n${data.email} | ${data.phone} | ${data.location}\n\nACADEMIC PROFILE\n${summary}\n\nEDUCATION\n${data.education}\n\nSKILLS\n${data.skills}\n\nPROJECTS / RESEARCH\n${projects}\n\nEXPERIENCE\n${experience}` +
    section("CERTIFICATIONS", certs) +
    section("PERSONAL DETAILS", personal);
}

function generateBiodata(data) {
  return `BIODATA\n\nName: ${data.name}\nAge: ${data.age}\nHeight: ${data.height}\nLocation: ${data.location}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nEducation:\n${data.education}\n\nAbout:\n${data.summary || "Simple, family-oriented, and career-focused individual."}\n\nFamily Background:\n${data.family}\n\nPartner Preference:\n${data.partnerPreference || "Compatible, respectful, educated, and family-oriented partner."}`;
}
