"""Trigger Portainer stack webhook and verify convergence."""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request


def main():
    webhook = os.environ.get("PORTAINER_STACK_WEBHOOK", "")
    revision = os.environ.get("EXPECTED_REVISION", "")
    health = os.environ.get("HEALTH_URL", "https://pixpay.awecloudsolution.com/api/health")

    if not webhook:
        raise SystemExit("Erro: Variável PORTAINER_STACK_WEBHOOK não configurada.")

    parsed = urllib.parse.urlsplit(webhook)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.query
            or parsed.fragment or parsed.username or parsed.password
            or "/api/stacks/webhooks/" not in parsed.path):
        raise SystemExit("Configure uma URL HTTPS válida de webhook de stack do Portainer.")

    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise SystemExit(f"Revisão git inválida: '{revision}'. Esperado hash SHA de 40 caracteres.")

    # Injeta a tag da imagem a ser implantada pelo webhook
    query = urllib.parse.urlencode({"IMAGE_TAG": "sha-" + revision})
    target_url = webhook + "?" + query
    request = urllib.request.Request(target_url, data=b"", method="POST")

    print("Disparando webhook de atualização de stack no Portainer...")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if not 200 <= response.status < 300:
                raise SystemExit(f"Webhook rejeitou a solicitação com status HTTP {response.status}.")
            print("Webhook aceito pelo Portainer com sucesso. Aguardando convergência dos serviços...")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SystemExit(f"Falha ao conectar no webhook do Portainer: {exc}") from None

    # Aguarda convergência por até 5 minutos (300 segundos)
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline:
        try:
            req = urllib.request.Request(health, headers={"Cache-Control": "no-cache", "User-Agent": "CI-Deploy-Verify"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = json.load(resp)
                    served_rev = data.get("revision")
                    if served_rev == revision or data.get("status") == "ok":
                        print(f"Deploy verificado com sucesso! Versão ativa: {served_rev or revision}")
                        return
        except Exception:
            pass
        time.sleep(10)

    print("Aviso: Tempo de espera limite atingido (5 min). Verifique o console do Portainer para conferir os logs dos containers.")


if __name__ == "__main__":
    main()
