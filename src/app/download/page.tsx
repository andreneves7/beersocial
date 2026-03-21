export default function DownloadPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: '20px',
      fontFamily: 'system-ui'
    }}>
      <h1>🍺 BeerSocial</h1>
      <a 
        href="/api/download-beer" 
        style={{
          padding: '15px 30px',
          backgroundColor: '#f59e0b',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        📥 Download beer.zip (596 KB)
      </a>
    </div>
  )
}
