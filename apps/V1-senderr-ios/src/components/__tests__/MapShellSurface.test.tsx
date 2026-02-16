import React from 'react';
import renderer from 'react-test-renderer';
import MapView from 'react-native-maps';

import {MapShellSurface} from '../MapShellSurface';

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(() => ({
    featureFlags: {useFeatureFlags: () => ({state: {flags: {mapRouting: true}}})},
  })),
}));

const noop = () => {};

describe('MapShellSurface', () => {
  it('enables map interaction when cameraMode is manual', () => {
    const tree = renderer.create(
      <MapShellSurface
        activeJob={null}
        courierLocation={null}
        routeCoordinates={[]}
        cameraMode="manual"
        onCameraModeChange={noop}
        viewMode="full"
      />,
    );

    const map = tree.root.findByType(MapView);
    expect(map.props.scrollEnabled).toBe(true);
    expect(map.props.zoomEnabled).toBe(true);
    expect(map.props.rotateEnabled).toBe(true);
    expect(map.props.pitchEnabled).toBe(true);
  });

  it('keeps map interactions enabled even when not in manual mode', () => {
    const tree = renderer.create(
      <MapShellSurface
        activeJob={null}
        courierLocation={null}
        routeCoordinates={[]}
        cameraMode="fit_route"
        onCameraModeChange={noop}
        viewMode="full"
      />,
    );

    const map = tree.root.findByType(MapView);
    expect(map.props.scrollEnabled).toBe(true);
    expect(map.props.zoomEnabled).toBe(true);
    expect(map.props.rotateEnabled).toBe(true);
    expect(map.props.pitchEnabled).toBe(true);
  });
});
