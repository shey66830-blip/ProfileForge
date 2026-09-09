import { searchRemoteJobs } from "../services/jobService.js";

export const getJobs = async (req, res) => {
    try {

        const { search, category, country, resumeText, sources } = req.query;

        const result = await searchRemoteJobs({
            search: search || "",
            category: category || "",
            country: country || "all",
            resumeText: resumeText || "",
            sources: typeof sources === "string" && sources.trim()
                ? sources.split(",").map((s) => s.trim()).filter(Boolean)
                : [],
        });

        return res.json(result);

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};