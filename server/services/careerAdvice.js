// =============================================
// ProfileForge AI Career Advisor
// Version 1.0
// =============================================

const DOMAIN_ROADMAPS = {

    "Software Development": {

        skills: [
            "Data Structures & Algorithms",
            "React",
            "Node.js",
            "System Design",
            "SQL",
            "Git",
            "Docker"
        ],

        certifications: [
            "AWS Cloud Practitioner",
            "Google Associate Cloud Engineer",
            "Meta Front-End Developer"
        ],

        companies: [
            "Google",
            "Microsoft",
            "Amazon",
            "Adobe",
            "Atlassian",
            "TCS",
            "Infosys"
        ]

    },

    "Artificial Intelligence": {

        skills: [
            "Python",
            "Machine Learning",
            "Deep Learning",
            "TensorFlow",
            "PyTorch",
            "MLOps"
        ],

        certifications: [
            "DeepLearning.AI",
            "TensorFlow Developer",
            "Google AI"
        ],

        companies: [
            "OpenAI",
            "Google DeepMind",
            "NVIDIA",
            "Microsoft",
            "Meta"
        ]

    },

    "Healthcare": {

        skills: [
            "Clinical Documentation",
            "Patient Care",
            "Medical Coding",
            "Healthcare Communication"
        ],

        certifications: [
            "Clinical Research",
            "Medical Coding",
            "Healthcare Management"
        ],

        companies: [
            "Apollo Hospitals",
            "Fortis",
            "Max Healthcare",
            "AIIMS"
        ]

    }

};

export default function careerAdvisor({

    resume = {},

    salary = {}

}) {

    const domains = resume.careerDomains || [];

    const primaryDomain =

        domains[0] ||

        "Software Development";

    const roadmap =

        DOMAIN_ROADMAPS[primaryDomain] ||

        DOMAIN_ROADMAPS["Software Development"];

    return {

        primaryCareer: primaryDomain,

        currentLevel:

            resume.estimatedExperience > 2

                ? "Experienced"

                : resume.estimatedExperience > 0

                ? "Beginner"

                : "Fresher",

        roadmap: {

            threeMonths: [

                "Strengthen fundamentals",

                "Complete 2 portfolio projects",

                "Improve resume"

            ],

            sixMonths: [

                "Earn one certification",

                "Apply for internships/jobs",

                "Build GitHub portfolio"

            ],

            oneYear: [

                "Secure full-time role",

                "Master advanced concepts",

                "Contribute to open source"

            ],

            threeYears: [

                "Become Mid-Level Professional",

                "Lead projects",

                "Mentor juniors"

            ],

            fiveYears: [

                "Senior Engineer / Specialist",

                "Leadership or Technical Expert",

                "Target top global companies"

            ]

        },

        recommendedSkills:

            roadmap.skills,

        certifications:

            roadmap.certifications,

        targetCompanies:

            roadmap.companies,

        estimatedSalaryGrowth: {

            current:

                salary.average || 0,

            afterOneYear:

                Math.round((salary.average || 0) * 1.25),

            afterThreeYears:

                Math.round((salary.average || 0) * 1.75),

            afterFiveYears:

                Math.round((salary.average || 0) * 2.40)

        },

        advice: [

            "Maintain an updated resume.",

            "Keep your LinkedIn profile active.",

            "Practice technical interviews regularly.",

            "Build real-world projects.",

            "Learn in-demand tools every quarter."

        ]

    };

}