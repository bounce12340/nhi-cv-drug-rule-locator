# Governed dataset storage

Each approved dataset version has one directory at `data/governed/<datasetVersion>/`. A future directory must contain its `storage-manifest/v1` manifest and exactly the files declared by that manifest.

Only a versioned payload covered by an exact `INTAKE-APPROVE` decision may enter this directory through a reviewed pull request. This README establishes the layout only; it is not an approval and contains no payload.

`packages/domain`, `apps/api`, and `apps/clinician` must never import, read, or otherwise reference this directory. Governed storage is not a runtime data source.

Versions are append-only. A revoked version remains in place with `revoked: true`; it is never deleted or overwritten.
