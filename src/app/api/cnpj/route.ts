import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const cnpj = request.nextUrl.searchParams.get('cnpj')

  if (!cnpj) {
    return NextResponse.json({ error: 'CNPJ e obrigatorio' }, { status: 400 })
  }

  // Remove formatting (dots, slashes, dashes)
  const cnpjClean = cnpj.replace(/[^\d]/g, '')

  if (cnpjClean.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 digitos' }, { status: 400 })
  }

  try {
    // Try BrasilAPI first
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'CNPJ nao encontrado' }, { status: 404 })
      }
      throw new Error(`BrasilAPI retornou status ${response.status}`)
    }

    const data = await response.json()

    // Build full address
    const addressParts = [
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro,
      data.municipio ? `${data.municipio}/${data.uf}` : null,
      data.cep ? `CEP: ${data.cep}` : null,
    ].filter(Boolean)

    const result = {
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

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Erro ao consultar CNPJ:', err)
    return NextResponse.json(
      { error: 'Erro ao consultar CNPJ. Tente novamente.' },
      { status: 502 }
    )
  }
}
