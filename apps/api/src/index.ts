import express from "express"
import cors from "cors"
import studentRoutes from "./routes/student.routes"
import minigameRoutes from "./routes/minigame.routes"
import knowledgeRoutes from "./routes/knowledge.routes"

const app = express()

// 允许所有来源访问（开发环境可用）
app.use(cors())

app.use(express.json())
app.use("/students", studentRoutes)
app.use("/minigames", minigameRoutes)
app.use("/knowledge", knowledgeRoutes)

app.listen(3001, () => {
  console.log("API running on http://localhost:3001")
})
