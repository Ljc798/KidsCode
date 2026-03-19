import ExerciseEditor from "@/app/admin/(dashboard)/exercises/ExerciseEditor"

export default async function EditExercisePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ExerciseEditor exerciseId={id} />
}
