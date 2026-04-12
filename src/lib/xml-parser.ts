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

const MAX_XML_SIZE = 1 * 1024 * 1024 // 1MB — NFe real raramente passa de 100KB

// Padroes de XXE/entidades externas que tentam ler arquivos ou acessar URLs
const DANGEROUS_XML_PATTERNS = [
  /<!DOCTYPE/i,
  /<!ENTITY/i,
  /SYSTEM\s+["']/i,
  /PUBLIC\s+["']/i,
]

export function parseNFXml(xmlContent: string): NFData {
  if (typeof xmlContent !== 'string' || xmlContent.length === 0) {
    throw new Error('XML vazio ou invalido')
  }

  if (xmlContent.length > MAX_XML_SIZE) {
    throw new Error('XML excede o tamanho maximo permitido (1MB)')
  }

  // Bloqueia XML com DOCTYPE/ENTITY — NFe legitima nao usa esses recursos.
  // Defesa contra XXE (External Entity) e Billion Laughs antes mesmo do parse.
  for (const pattern of DANGEROUS_XML_PATTERNS) {
    if (pattern.test(xmlContent)) {
      throw new Error('XML contem declaracoes nao permitidas (DOCTYPE/ENTITY)')
    }
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    processEntities: false, // nao expande entidades
    htmlEntities: false,
  })

  const parsed = parser.parse(xmlContent)
  const nfe = parsed?.nfeProc?.NFe?.infNFe || parsed?.NFe?.infNFe

  if (!nfe) {
    throw new Error('XML de NF-e invalido')
  }

  const emit = nfe.emit || {}
  const detRaw = nfe.det
  if (!detRaw) {
    throw new Error('XML de NF-e sem itens (det)')
  }
  const det = Array.isArray(detRaw) ? detRaw : [detRaw]
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
