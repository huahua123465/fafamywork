import type { Project } from '../types'
import details from 'virtual:projects/details'

export const projectDetails: Project[] = details
export function findProject(slug: unknown): Project | undefined {
  return projectDetails.find((project) => project.slug === slug)
}
