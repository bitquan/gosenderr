/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, vi, beforeEach, expect } from "vitest";

vi.mock("@/lib/foodPickup", () => ({
  useFoodPickupRestaurants: () => ({
    restaurants: [
      { id: "r1", restaurantName: "Tasty Pizza", location: { city: 'Testville', zip: '12345' }, cuisineTags: ['pizza'], updatedAt: { toDate: () => new Date() } },
    ],
    loading: false,
    error: null,
  }),
  toCityZipLabel: (restaurant: any) => `${restaurant.location.city} • ${restaurant.location.zip}`,
  formatTags: (tags: string[] = []) => (tags || []).join(', '),
}));

import FoodPickupsPage from "@/pages/food-pickups/page";

describe("FoodPickupsPage route wiring and render", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders list of food pickup restaurants and page header", async () => {
    render(
      <MemoryRouter initialEntries={["/food-pickups"]}>
        <FoodPickupsPage />
      </MemoryRouter>,
    );

    // assert the main page heading is present
    expect(screen.getByRole('heading', { name: /Order pickup from local restaurants/i })).toBeTruthy();
    const matches = screen.getAllByText(/Tasty Pizza/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
