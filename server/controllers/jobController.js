import { searchRemoteJobs } from "../services/jobService.js";

export const getJobs = async (req, res) => {
    try {

        const { search, category, country, resumeText } = req.query;

        const result = await searchRemoteJobs({
            search: search || "",
            category: category || "",
            country: country || "all",
            resumeText: resumeText || "",
        });

        return res.json(result);

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};