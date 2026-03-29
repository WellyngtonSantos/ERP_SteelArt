import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

function createTimeout(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function fetchBrasilAPI(cnpj: string) {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
    signal: createTimeout(8000),
  })

  if (!response.ok) {
    if (response.status === 404) return { notFound: true }
    throw new Error(`BrasilAPI status ${response.status}`)
  }

  const data = await response.json()

  const addressParts = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
    data.municipio ? `${data.municipio}/${data.uf}` : null,
    data.cep ? `CEP: ${data.cep}` : null,
  ].filter(Boolean)

  return {
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    telefone: data.ddd_telefone_1
      ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}`
      : '',
    email: data.email || '',
    endereco: addressParts.join(', '),
    cep: data.cep || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    situacao: data.descricao_situacao_cadastral || '',
  }
}

async function fetchReceitaWS(cnpj: string) {
  const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
    signal: createTimeout(10000),
  })

  if (!response.ok) {
    if (response.status === 404) return { notFound: true }
    throw new Error(`ReceitaWS status ${response.status}`)
  }

  const data = await response.json()

  if (data.status === 'ERROR') {
    return { notFound: true }
  }

  const addressParts = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
    data.municipio ? `${data.municipio}/${data.uf}` : null,
    data.cep ? `CEP: ${data.cep}` : null,
  ].filter(Boolean)

  const telefone = data.telefone
    ? data.telefone.replace(/[^\d]/g, '').replace(/^(\d{2})(\d+)/, '($1) $2')
    : ''

  return {
    razaoSocial: data.nome || '',
    nomeFantasia: data.fantasia || '',
    telefone,
    email: data.email || '',
    endereco: addressParts.join(', '),
    cep: data.cep || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    situacao: data.situacao || '',
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const cnpj = request.nextUrl.searchParams.get('cnpj')

  if (!cnpj) {
    return NextResponse.json({ error: 'CNPJ e obrigatorio' }, { status: 400 })
  }

  const cnpjClean = cnpj.replace(/[^\d]/g, '')

  if (cnpjClean.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 digitos' }, { status: 400 })
  }

  // Try BrasilAPI first, fallback to ReceitaWS
  try {
    const result = await fetchBrasilAPI(cnpjClean)
    if (!('notFound' in result)) {
      return NextResponse.json(result)
    }
  } catch (err) {
    console.warn('BrasilAPI falhou, tentando ReceitaWS:', (err as Error).message)
  }

  try {
    const result = await fetchReceitaWS(cnpjClean)
    if ('notFound' in result) {
      return NextResponse.json({ error: 'CNPJ nao encontrado' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('Ambas APIs falharam:', (err as Error).message)
    return NextResponse.json(
      { error: 'Erro ao consultar CNPJ. Tente novamente em alguns segundos.' },
      { status: 502 }
    )
  }
}
