/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
import { Enum } from '../utils/Enum.js'

/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
const PARTNER = Enum.DOCUMENT.TYPE.PARTNER
const VEHICLE = Enum.DOCUMENT.TYPE.VEHICLE
const DocumentConfig = {
  STORAGE: {
    [PARTNER]: 'public/Auth/Partners',
    [VEHICLE]: 'public/Auth/Vehicles'
  },
  [PARTNER]: [
    {
      name: 'Pan Card',
      indexName: 'panCard',
      description: '',
      status: true,
      mandatory: true,
      fields: [
        {
          name: 'Front Image',
          indexName: 'frontImage',
          type: 'image',
          value: ''
        },
        {
          name: 'Back Image',
          indexName: 'backImage',
          type: 'image',
          value: ''
        }
      ]
    },
    {
      name: 'ID Proof',
      indexName: 'idProof',
      description: '',
      status: true,
      mandatory: true,
      fields: [
        {
          name: 'Front Image',
          indexName: 'frontImage',
          type: 'image',
          value: ''
        },
        {
          name: 'Expiry Date',
          indexName: 'expDate',
          type: 'date',
          value: ''
        }
      ]
    }
  ],
  [VEHICLE]: [
    {
      name: 'Insurance',
      indexName: 'insurance',
      description: '',
      storage: '',
      status: true,
      mandatory: true,
      fields: [
        {
          name: 'Front Image',
          indexName: 'frontImage',
          type: 'image',
          value: ''
        },
        {
          name: 'Back Image',
          indexName: 'backImage',
          type: 'image',
          value: ''
        },
        {
          name: 'Document Number',
          indexName: 'documentNumber',
          type: 'string',
          value: ''
        },
        {
          name: 'Expiry Date',
          indexName: 'expDate',
          type: 'date',
          value: ''
        }
      ]
    },
    {
      name: 'Vehicle Image',
      indexName: 'vehicle image',
      description: '',
      storage: 'public/Auth/Vehicles',
      status: true,
      mandatory: false,
      fields: [
        {
          name: 'Front Image',
          indexName: 'frontImage',
          type: 'image',
          value: ''
        },
        {
          name: 'Back Image',
          indexName: 'backImage',
          type: 'image',
          value: ''
        }
      ]
    }
  ],
  types: [
    {
      label: 'Partner',
      value: Enum.DOCUMENT.TYPE.PARTNER
    },
    {
      label: 'Vehicle',
      value: Enum.DOCUMENT.TYPE.VEHICLE
    }
  ],
  fileTypes: [
    {
      label: 'Text',
      value: Enum.DOCUMENT.FILETYPE.TEXT
    },
    {
      label: 'Image',
      value: Enum.DOCUMENT.FILETYPE.IMAGE
    },
    {
      label: 'Date',
      value: Enum.DOCUMENT.FILETYPE.DATE
    }
  ]
}

export { DocumentConfig }
