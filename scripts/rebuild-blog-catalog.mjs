import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const blogPath = path.join(root, 'blog.html')
const sitemapPath = path.join(root, 'sitemap.xml')
const baseUrl = 'https://www.elitedentalsmiles.com'

const decode = value => String(value || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const escapeHtml = value => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const articleFiles = fs.readdirSync(root)
  .filter(file => /^blog-.*\.html$/.test(file) && file !== 'blog.html')

const articles = articleFiles.map(file => {
  const html = fs.readFileSync(path.join(root, file), 'utf8')
  const date = (html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1]
  if (!date) return null
  const title = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
  const description = decode((html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || [])[1])
  const category = decode((html.match(/<div[^>]*class=["'][^"']*pill[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1]) || 'Dental Health'
  return {
    file,
    slug: file.replace(/\.html$/, ''),
    date,
    title: title || file,
    description: description || 'Practical dental health guidance from the doctors at Elite Dental.',
    category
  }
}).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))

if (!articles.length) throw new Error('No dated blog articles found')

const cards = articles.map(article => {
  const displayDate = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${article.date}T00:00:00Z`))
  return `    <article class="blog-card anim-up">
      <div class="blog-card-icon" aria-hidden="true">🦷</div>
      <div class="blog-card-body">
        <span class="blog-card-tag">${escapeHtml(article.category)}</span>
        <h2><a href="/${article.slug}">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.description)}</p>
        <div class="blog-card-meta">
          <span>${displayDate}</span><a href="/${article.slug}" class="blog-read-link">Read more &rarr;</a>
        </div>
      </div>
    </article>`
}).join('\n\n')

let blog = fs.readFileSync(blogPath, 'utf8')
const gridStart = blog.indexOf('<div class="blog-grid">')
const gridEnd = blog.indexOf('\n</div>\n</main>', gridStart)
if (gridStart < 0 || gridEnd < 0) throw new Error('Could not locate blog card grid')
blog = `${blog.slice(0, gridStart)}<div class="blog-grid">\n\n${cards}\n${blog.slice(gridEnd)}`

const itemList = articles.map((article, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  url: `${baseUrl}/${article.slug}`
}))
const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Dental Health Blog - Elite Dental',
  description: 'Expert dental health articles from Elite Dental covering sedation dentistry, dental implants, cosmetic dentistry, and oral health tips.',
  url: `${baseUrl}/blog`,
  publisher: {
    '@type': 'Dentist',
    name: 'Elite Dental',
    url: baseUrl,
    telephone: '(865) 397-5422',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '334 TN-92 #1',
      addressLocality: 'Dandridge',
      addressRegion: 'TN',
      postalCode: '37725'
    }
  },
  mainEntity: { '@type': 'ItemList', itemListElement: itemList }
}
blog = blog.replace(
  /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"CollectionPage"[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>`
)
fs.writeFileSync(blogPath, blog)

let sitemap = fs.readFileSync(sitemapPath, 'utf8')
const existingBlogBlocks = sitemap.match(/\s*<url>\s*<loc>https:\/\/www\.elitedentalsmiles\.com\/blog-[\s\S]*?<\/url>/g) || []
for (const block of existingBlogBlocks) sitemap = sitemap.replace(block, '')
const articleUrls = articles.map(article => `  <url>
    <loc>${baseUrl}/${article.slug}</loc>
    <lastmod>${article.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')
sitemap = sitemap.replace('\n</urlset>', `\n${articleUrls}\n</urlset>`)
fs.writeFileSync(sitemapPath, sitemap)

console.log(`Catalog rebuilt with ${articles.length} dated articles.`)
