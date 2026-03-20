import "./lib/loadEnv"
import express from "express"
import cors from "cors"
import studentRoutes from "./routes/student.routes"
import minigameRoutes from "./routes/minigame.routes"
import knowledgeRoutes from "./routes/knowledge.routes"
import adminAuthRoutes from "./routes/adminAuth.routes"
import studentAuthRoutes from "./routes/studentAuth.routes"
import leaderboardRoutes from "./routes/leaderboard.routes"
import exerciseRoutes from "./routes/exercise.routes"
import adminExerciseRoutes from "./routes/adminExercise.routes"
import adminExerciseReviewRoutes from "./routes/adminExerciseReview.routes"
import petRoutes from "./routes/pet.routes"
import projectRoutes from "./routes/project.routes"
import adminProjectReviewRoutes from "./routes/adminProjectReview.routes"

const app = express()

// 允许所有来源访问（开发环境可用）
app.use(cors())

app.use(express.json({ limit: "25mb" }))
app.use("/students", studentRoutes)
app.use("/minigames", minigameRoutes)
app.use("/knowledge", knowledgeRoutes)
app.use("/auth/admin", adminAuthRoutes)
app.use("/auth/student", studentAuthRoutes)
app.use("/leaderboard", leaderboardRoutes)
app.use("/pets", petRoutes)
app.use("/exercises", exerciseRoutes)
app.use("/admin/exercises", adminExerciseRoutes)
app.use("/admin/exercise-reviews", adminExerciseReviewRoutes)
app.use("/projects", projectRoutes)
app.use("/admin/project-reviews", adminProjectReviewRoutes)

app.listen(3001, () => {
  console.log("API running on http://localhost:3001")
})
