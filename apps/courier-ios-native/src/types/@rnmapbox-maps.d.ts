declare module '@rnmapbox/maps' {
  import * as React from 'react';
  
  // Module-level functions
  export function setAccessToken(token: string): void;
  export function setWellKnownTileServer(server: string): void;
  export function setTelemetryEnabled(enabled: boolean): void;
  export function setConnected(connected: boolean): void;
  
  // This extends the Mapbox types to be compatible with React Native 0.76+ JSX
  namespace MapboxGL {
    interface CameraRef {
      setCamera(config: any): void;
    }
    
    class Camera extends React.Component<any> {
      setCamera(config: any): void;
    }
    class MapView extends React.Component<any> {}
    class UserLocation extends React.Component<any> {}
    class ShapeSource extends React.Component<any> {}
    class LineLayer extends React.Component<any> {}
    class FillLayer extends React.Component<any> {}
    class CircleLayer extends React.Component<any> {}
    class SymbolLayer extends React.Component<any> {}
    class MarkerView extends React.Component<any> {}
    class Callout extends React.Component<any> {}
    class Images extends React.Component<any> {}
    class Light extends React.Component<any> {}
    class Style extends React.Component<any> {}
    class Terrain extends React.Component<any> {}
    class Atmosphere extends React.Component<any> {}
    
    enum UserTrackingMode {
      Follow = 'follow',
      FollowWithCourse = 'followWithCourse',
      FollowWithHeading = 'followWithHeading',
    }
    
    const StyleURL: {
      Dark: string;
      Light: string;
      Street: string;
      Outdoors: string;
      Satellite: string;
      SatelliteStreet: string;
    };
    
    const locationManager: any;
    
    // Re-export module functions on the namespace for convenience
    function setAccessToken(token: string): void;
  }
  
  export default MapboxGL;
}
