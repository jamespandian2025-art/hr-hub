'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FileText, Pencil, Search, Trash2 } from 'lucide-react'
import { loadWorkflowProjects, loadWorkflowTasks, saveWorkflowTasks } from '@/lib/workflows/data'

type DraftJob = ReturnType<typeof loadWorkflowTasks>[number]

export default function DraftJobsPage() {
  const [tasks, setTasks] = useState(loadWorkflowTasks)
  const [projects] = useState(loadWorkflowProjects)
  const [search, setSearch] = useState('')
  const projectById = useMemo(() => new Map(projects.map(project => [String(project.id), project])), [projects])
  const drafts = tasks.filter(task => task.draft)
  const filteredDrafts = drafts.filter(task => {
    const needle = search.trim().toLowerCase()
    const project = projectById.get(String(task.projectId))
    return !needle || [task.title, task.description || '', project?.name || ''].some(value => value.toLowerCase().includes(needle))
  })

  function deleteDraft(task: DraftJob) {
    const next = tasks.filter(item => String(item.id) !== String(task.id))
    setTasks(next)
    saveWorkflowTasks(next)
  }

  return (
    <main className="wf-drafts-page">
      <style>{draftJobsCss}</style>
      <header>
        <div>
          <h1>Draft Jobs</h1>
          <p>Jobs saved before publishing to a workflow board.</p>
        </div>
        <label>
          <Search size={16} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search draft jobs..." />
        </label>
      </header>

      <section>
        {filteredDrafts.length ? filteredDrafts.map(task => {
          const project = projectById.get(String(task.projectId))
          return (
            <article key={String(task.id)}>
              <span><FileText size={20} /></span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.description || 'No description yet.'}</p>
                <small>{project?.name || 'Workflow'} / {task.dueDate || 'No due date'}</small>
              </div>
              <Link href={project ? `/workflows/${project.id}/add-job` : '/workflows/my-jobs'}><Pencil size={15} /> Continue</Link>
              <button type="button" onClick={() => deleteDraft(task)}><Trash2 size={15} /> Delete</button>
            </article>
          )
        }) : (
          <div className="empty">
            <FileText size={42} />
            <strong>No draft jobs</strong>
            <p>Use Save draft from the add-job screen to keep unfinished jobs here.</p>
          </div>
        )}
      </section>
    </main>
  )
}

const draftJobsCss = `
.wf-drafts-page {
  min-height: calc(100vh - 66px);
  padding: 26px 28px 32px;
  background: #fff;
  color: #111827;
  font-family: var(--font-body);
}
.wf-drafts-page header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}
.wf-drafts-page h1 {
  margin: 0;
  font-size: 28px;
}
.wf-drafts-page p {
  margin: 7px 0 0;
  color: #000000;
  font-size: 14px;
}
.wf-drafts-page label {
  min-height: 42px;
  min-width: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #000000;
}
.wf-drafts-page input {
  border: 0;
  outline: 0;
  min-width: 0;
  flex: 1;
  font: inherit;
}
.wf-drafts-page section {
  display: grid;
  gap: 10px;
}
.wf-drafts-page article {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
}
.wf-drafts-page article > span {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #ecfdf5;
  color: #0f9f5f;
}
.wf-drafts-page strong {
  display: block;
}
.wf-drafts-page small {
  display: block;
  color: #000000;
  margin-top: 5px;
}
.wf-drafts-page a,
.wf-drafts-page button {
  min-height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.wf-drafts-page button {
  color: #dc2626;
  border-color: #fecaca;
}
.wf-drafts-page .empty {
  min-height: 360px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  color: #000000;
  gap: 8px;
}
.wf-drafts-page .empty strong {
  color: #111827;
  font-size: 18px;
}
@media (max-width: 720px) {
  .wf-drafts-page header,
  .wf-drafts-page article {
    display: grid;
  }
  .wf-drafts-page label {
    min-width: 0;
  }
}
`
