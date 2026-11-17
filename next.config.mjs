/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit membaca file .afm font dari disk, jadi jangan di-bundle.
  serverExternalPackages: ["pdfkit"],
}

export default nextConfig
