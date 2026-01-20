import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>404</h1>
      <h2 style={{ marginTop: '20px' }}>Page Not Found</h2>
      <p style={{ marginTop: '10px', color: '#666' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link 
        href="/login" 
        style={{ 
          marginTop: '30px',
          padding: '12px 24px', 
          background: '#2196f3', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '4px' 
        }}
      >
        Go to Login
      </Link>
    </div>
  );
}
