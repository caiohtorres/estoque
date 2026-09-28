export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-title">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}
