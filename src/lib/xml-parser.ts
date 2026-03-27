import { XMLParser } from 'fast-xml-parser'

export interface NFItem {
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  unit: string
  ncm?: string
}

export interface NFData {
  supplierName: string
  supplierCnpj: string
  number: string
  totalAmount: number
  items: NFItem[]
}

export function parseNFXml(xmlContent: string): NFData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })

  const parsed = parser.parse(xmlContent)
  const nfe = parsed.nfeProc?.NFe?.infNFe || parsed.NFe?.infNFe

  if (!nfe) {
    throw new Error('XML de NF-e invalido')
  }

  const emit = nfe.emit || {}
  const det = Array.isArray(nfe.det) ? nfe.det : [nfe.det]
  const total = nfe.total?.ICMSTot || {}

  const items: NFItem[] = det.map((item: any) => {
    const prod = item.prod || {}
    return {
      description: prod.xProd || '',
      quantity: parseFloat(prod.qCom) || 0,
      unitPrice: parseFloat(prod.vUnCom) || 0,
      totalPrice: parseFloat(prod.vProd) || 0,
      unit: prod.uCom || 'UN',
      ncm: prod.NCM,
    }
  })

  return {
    supplierName: emit.xNome || emit.xFant || 'Fornecedor',
    supplierCnpj: String(emit.CNPJ || ''),
    number: nfe.ide?.nNF?.toString() || '',
    totalAmount: parseFloat(total.vNF) || items.reduce((s: number, i: NFItem) => s + i.totalPrice, 0),
    items,
  }
}
