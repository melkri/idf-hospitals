# Hospital location sources

Reviewed 2026-11-02. Status: `locations`, not a fully verified measures dataset.

Names, addresses, cities and regional inclusion were checked against the [official AP-HP directory](https://www.aphp.fr/nos-hopitaux). GHU memberships follow the [official six-GHU organisation page](https://www.aphp.fr/nous-connaitre/lorganisation-de-lap-hp/les-groupes-hospitalo-universitaires-de-lap-hp), updated 2026-05-28. The directory currently renders 42 entries despite its introductory “38 hospitals” wording. The application includes 37 regional entries after the exclusions below; this is not an assertion that AP-HP has 37 hospitals overall.

## Scope and exclusions

- Excluded Berck (62), Hendaye (64), Paul-Doumer in Labruyère (60), San Salvadour in Hyères (83): outside Île-de-France.
- Excluded Hospitalisation à Domicile: a home-care organisation, not one physical hospital campus.
- Broca and La Collégiale are separate physical locations; Lariboisière and Fernand-Widal are separate locations. Grouped names on the GHU page are expanded using the separately addressed directory entries.
- The Cochin marker represents the physical Cochin site at 27 rue du Faubourg Saint-Jacques. It does not purport to locate all Cochin–Port-Royal campuses at that point. Other Cochin-affiliated sites are outside this initial directory-based coverage.
- Sainte-Périne represents the Chardon-Lagache campus, not every satellite site in the Sainte-Périne–Rossini–Chardon-Lagache organisation. Satellite coverage requires a further physical-site registry review.
- No independent FINESS join has been completed. `APHP_SITE_*` IDs are stable local site keys, not official FINESS numbers. Do not regenerate them when a display name changes.

## Coordinates

Each JSON row has `identity_source` and `coordinate_source`, also linked in its detail panel. Coordinates are approximate campus points, not entrances, navigation directions or a survey. Most are transcribed from French Wikipedia's hospital coordinate infobox, converting degrees/minutes/seconds to WGS84 decimal degrees. The corresponding names, cities and addresses are cross-checked with AP-HP; Wikipedia is a secondary geographic source, not an official AP-HP coordinate feed. Retain that distinction when describing accuracy. Wikipedia content attribution: linked article contributors, [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/).

Georges-Clemenceau and La Roche-Guyon use OpenStreetMap campus points as displayed by Mapcarta, respectively [way 236469017](https://mapcarta.com/W236469017) and [way 429050004](https://mapcarta.com/W429050004). Attribution: OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright). Mapcarta displays these campus coordinates separately from Wikidata and other content. Do not reuse its imagery. A Wikipedia result for Georges-Clemenceau pointed to Henri-Mondor's coordinates in Créteil and was rejected. The La Roche-Guyon AP-HP transport page's coarse 49.0833, 1.6333 point is not used because the OSM hospital polygon provides a more specific campus location.

Before calling the complete location registry officially verified, reconcile every point and satellite site with current FINESS geographic records or an AP-HP geographic export. This release intentionally calls the points “sourced” and “approximate.” Coordinate bounds are only a sanity check.

## Measures

All ten metric slots are null for every real hospital. Labels remain proposed indicators, not claims about the availability or definition of AP-HP statistics. No synthetic measure was transferred onto a real hospital. `updated_at` is the registry review date, not a measure reporting period. Collect and document reporting period, exact definition, units, source and site-level applicability before populating a metric. Do not copy organisation-level figures onto each campus.

The former synthetic dataset is retained only as `tests/fixtures/demo.json`. The demo generator writes to that fixture, never to the published registry.
