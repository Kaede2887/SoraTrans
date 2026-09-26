import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createFilteredRowModel,
    createSortedRowModel,
    filterFn_includesString,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_text,
    tableFeatures,
  } from "@tanstack/react-table"
  
  // New in v9: declare the features this table uses — anything you don't
  // register is tree-shaken out of the bundle.
  export const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    filterFns: { includesString: filterFn_includesString },
    sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  })
  
  // Pass this as the first generic argument to `ColumnDef`, `Column`, `Table`,
  // and `Row` so each type knows which feature APIs are available.
  export type DataTableFeatures = typeof features