export function validateBuilderData(type, data) {
  const required = ["name", "email", "phone", "location", "education", "skills"];

  for (const field of required) {
    if (!data[field] || data[field].trim() === "") {
      return { ok: false, message: `Please fill ${field}` };
    }
  }

  if (!data.email.includes("@")) {
    return { ok: false, message: "Invalid email" };
  }

  if (type === "biodata") {
    if (!data.age || !data.height || !data.family) {
      return { ok: false, message: "Fill biodata details" };
    }
  }

  return { ok: true };
}