import { profile, skills, experience, projects, education, achievements, RESUME_PDF } from '../content'

// The full resume as semantic HTML: read by screen readers and search engines,
// visually hidden because the same content is shown in the 3D book.
export default function HiddenResume() {
  return (
    <main className="sr-only">
      <h1>{profile.name}</h1>
      <p>{profile.tagline}</p>
      <p>{profile.intro}</p>
      <ul>
        {profile.links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>
              {l.label}: {l.value}
            </a>
          </li>
        ))}
        <li>
          <a href={RESUME_PDF} download>
            Download resume (PDF)
          </a>
        </li>
      </ul>

      <h2>Experience</h2>
      {experience.map((e) => (
        <section key={e.company}>
          <h3>
            {e.role}, {e.company}
          </h3>
          <p>
            {e.where} · {e.when}
          </p>
          <ul>
            {e.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Projects</h2>
      {projects.map((p) => (
        <section key={p.name}>
          <h3>
            {p.name} — {p.kind}
          </h3>
          <p>{p.stack.join(', ')}</p>
          <ul>
            {p.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {p.link && <a href={p.link.href}>{p.link.label}</a>}
        </section>
      ))}

      <h2>Technical skills</h2>
      <dl>
        {skills.map((s) => (
          <div key={s.group}>
            <dt>{s.group}</dt>
            <dd>{s.items.map((i) => i.name).join(', ')}</dd>
          </div>
        ))}
      </dl>

      <h2>Education</h2>
      <ul>
        {education.map((e) => (
          <li key={e.school}>
            {e.school} — {e.detail}, {e.when} ({e.score})
          </li>
        ))}
      </ul>

      <h2>Achievements</h2>
      <ul>
        {achievements.map(([a, b]) => (
          <li key={a}>
            {a}: {b}
          </li>
        ))}
      </ul>
    </main>
  )
}
