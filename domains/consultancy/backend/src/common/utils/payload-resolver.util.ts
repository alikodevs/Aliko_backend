/**
 * Resolves the correct data source for hybrid controllers that handle
 * both HTTP (@Body) and microservice (@Payload) requests.
 *
 * HTTP requests populate @Body; TCP/RMQ requests populate @Payload.
 * This helper picks whichever is non-empty.
 */
export function resolvePayload<T = any>(httpData: any, tcpPayload: any): T {
  if (
    httpData &&
    typeof httpData === 'object' &&
    Object.keys(httpData).length > 0
  ) {
    return httpData;
  }
  if (tcpPayload && typeof tcpPayload === 'object' && 'data' in tcpPayload && tcpPayload.data) {
    return tcpPayload.data;
  }
  return tcpPayload;
}

/**
 * Resolves a single value (e.g. an ID, slug, type) from HTTP param vs TCP payload.
 */
export function resolveParam<T = any>(httpParam: any, tcpParam: any, fieldKey?: string): T {
  if (httpParam !== undefined && httpParam !== null && httpParam !== '') {
    return httpParam;
  }
  if (tcpParam && typeof tcpParam === 'object') {
    if (fieldKey && fieldKey in tcpParam) {
      return tcpParam[fieldKey];
    }
    if ('id' in tcpParam) return tcpParam.id;
    if ('slug' in tcpParam) return tcpParam.slug;
    if ('userId' in tcpParam) return tcpParam.userId;
    if ('type' in tcpParam) return tcpParam.type;
    if ('code' in tcpParam) return tcpParam.code;
    return undefined as any;
  }
  return tcpParam;
}
