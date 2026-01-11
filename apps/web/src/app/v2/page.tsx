export default function V2Landing() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>GoSenderr v2 — P2P Delivery</h1>
      <p style={{ marginTop: '20px', color: '#666' }}>
        Web-first delivery coordination platform
      </p>
      <p style={{ marginTop: '30px', marginBottom: '40px', color: '#888', fontSize: '14px' }}>
        Open multiple browser windows/tabs to test customer and courier simultaneously
      </p>
      
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a 
          href="/v2/login" 
          style={{ 
            padding: '12px 24px', 
            background: '#6E56CF', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px',
            display: 'inline-block',
            fontWeight: '500'
          }}
        >
          Sign In / Sign Up
        </a>
      </div>

      <div style={{ 
        marginTop: '60px', 
        padding: '30px', 
        background: '#f9f9f9', 
        borderRadius: '12px',
        maxWidth: '800px',
        margin: '60px auto 0',
        textAlign: 'left'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Testing Both Roles:</h3>
        <ol style={{ lineHeight: '1.8', color: '#666' }}>
          <li>
            <strong>Window 1 (Customer):</strong> Sign in as customer@test.com
            <ul style={{ marginTop: '8px', color: '#888', fontSize: '14px' }}>
              <li>Create and manage delivery jobs</li>
              <li>Track courier location in real-time</li>
            </ul>
          </li>
          <li style={{ marginTop: '12px' }}>
            <strong>Window 2 (Courier):</strong> Open in incognito/private mode, sign in as courier@test.com
            <ul style={{ marginTop: '8px', color: '#888', fontSize: '14px' }}>
              <li>Set your rates and go online</li>
              <li>View and accept available jobs</li>
              <li>Location automatically tracked when online</li>
            </ul>
          </li>
        </ol>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          💡 Use different browser profiles or incognito mode to sign in as different users simultaneously
        </p>
      </div>
    </div>
  );
}
