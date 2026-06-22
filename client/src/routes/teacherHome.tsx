import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/teacherHome')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/teacherHome"!</div>
}
