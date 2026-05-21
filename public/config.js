const CONFIG = {
  API_URL: "https://wohi2-course-project-production-c8b5.up.railway.app",
  ROUTES: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    QUESTIONS: "/api/questions",
  },
  FIELDS: {
    LOGIN: ["email", "password"],
    REGISTER: ["email", "password", "name"],
    QUESTION: ["question", "answer", "keywords"],
  },
  QUESTIONS_PER_PAGE: 5,
  STORAGE_KEY: "jwt_token",
  API_FIELDS: {
    SOLVED: "solved",
  },
};
