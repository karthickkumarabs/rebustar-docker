/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */

class StaticMap {
  static urlBuilder = (property, value, separator) => {
    if (value) {
      return `${property}${separator}${value}`
    }

    return null
  }

  static locationBuilder = (location) => {
    const urlParts = []

    if (Array.isArray(location)) {
      const arrParts = location.map((val) => this.locationBuilder(val))
      urlParts.push(...arrParts)
    }

    if (typeof location === 'string' || typeof location === 'number') {
      urlParts.push(location)
    }

    if (typeof location === 'object' && location.lat && location.lng) {
      urlParts.push(`${location.lat},${location.lng}`)
    }

    return urlParts.join('%7C')
  }

  static mapStrategy = async (props) => {
    const rootURL = 'https://maps.googleapis.com/maps/api/staticmap'
    const {
      size,
      zoom,
      scale,
      style,
      center,
      format,
      client,
      region,
      visible,
      channel,
      maptype,
      language,
      signature,
      key,
      mapId
    } = props

    const urlParts = []

    urlParts.push(this.urlBuilder('size', size, '='))
    urlParts.push(this.urlBuilder('zoom', zoom, '='))
    urlParts.push(this.urlBuilder('scale', scale, '='))
    urlParts.push(this.urlBuilder('style', style, '='))
    urlParts.push(this.urlBuilder('center', center, '='))
    urlParts.push(this.urlBuilder('format', format, '='))
    urlParts.push(this.urlBuilder('client', client, '='))
    urlParts.push(this.urlBuilder('region', region, '='))
    urlParts.push(this.urlBuilder('visible', visible, '='))
    urlParts.push(this.urlBuilder('channel', channel, '='))
    urlParts.push(this.urlBuilder('maptype', maptype, '='))
    urlParts.push(this.urlBuilder('language', language, '='))
    urlParts.push(this.urlBuilder('signature', signature, '='))
    urlParts.push(this.urlBuilder('key', key, '='))
    urlParts.push(this.urlBuilder('map_id', mapId, '='))

    const parts = urlParts.filter((x) => x).join('&')

    return `${rootURL}?${parts}`
  }

  static markerStrategy = (props, mapProps) => {
    const { size, color, label, anchor, iconURL, location, scale } = props

    if (!location) {
      throw new Error('Marker expects a valid location prop')
    }

    const urlParts = []

    urlParts.push(this.urlBuilder('size', size, ':'))
    urlParts.push(this.urlBuilder('color', color, ':'))
    urlParts.push(this.urlBuilder('label', label, ':'))
    urlParts.push(this.urlBuilder('anchor', anchor, ':'))
    urlParts.push(this.urlBuilder('scale', scale, ':'))
    urlParts.push(this.urlBuilder('icon', iconURL, ':'))
    urlParts.push(this.urlBuilder('', this.locationBuilder(location), ''))

    const url = urlParts.filter((x) => x).join('%7C')

    return `markers=${url}`
  }

  static markerGroupStrategy = (props, mapProps) => {
    const { size, color, label, anchor, iconURL, markers, scale } = props

    const location = markers.map((marker) => marker.location)

    return this.markerStrategy({ size, color, label, anchor, iconURL, location, scale }, mapProps)
  }

  static pathStrategy = (props, mapProps) => {
    const { weight, color, fillcolor, geodesic, points } = props

    if (!points) {
      throw new Error('Path expects a valid points prop')
    }

    const urlParts = []

    urlParts.push(this.urlBuilder('color', color, ':'))
    urlParts.push(this.urlBuilder('weight', weight, ':'))
    urlParts.push(this.urlBuilder('fillcolor', fillcolor, ':'))
    urlParts.push(this.urlBuilder('geodesic', geodesic, ':'))
    urlParts.push(this.urlBuilder('', this.locationBuilder(points), ''))

    const url = urlParts.filter((x) => x).join('%7C')

    return `path=${url}`
  }

  static pathGroupStrategy = (props, mapProps) => {
    const { weight, color, fillcolor, geodesic, paths } = props

    const points = paths.map((path) => path.points)

    return this.pathStrategy({ weight, color, fillcolor, geodesic, points })
  }

  static staticMapUrl = async (props) => {
    const { markers, markerGroups, paths, pathGroups, ...mapProps } = props

    const mainUrlParts = await this.mapStrategy(mapProps)
    const childrenUrlParts = []

    if (markers && Array.isArray(markers) && markers.length) {
      const markerUrlParts = markers.map((marker) => this.markerStrategy(marker, mapProps))
      childrenUrlParts.push(...markerUrlParts)
    }

    if (markerGroups && Array.isArray(markerGroups) && markerGroups.length) {
      const markerGroupUrlParts = markerGroups.map((markerGroup) =>
        this.markerGroupStrategy(markerGroup, mapProps)
      )
      childrenUrlParts.push(...markerGroupUrlParts)
    }

    if (paths && Array.isArray(paths) && paths.length) {
      const pathUrlParts = paths.map((path) => this.pathStrategy(path, mapProps))
      childrenUrlParts.push(...pathUrlParts)
    }

    if (pathGroups && Array.isArray(pathGroups) && pathGroups.length) {
      const pathGroupUrlParts = pathGroups.map((pathGroup) => this.pathGroupStrategy(pathGroup, mapProps))
      childrenUrlParts.push(...pathGroupUrlParts)
    }

    const childURL = childrenUrlParts.filter((part) => part).join('&')

    return `${mainUrlParts}&${childURL}`
  }
}

export { StaticMap }
