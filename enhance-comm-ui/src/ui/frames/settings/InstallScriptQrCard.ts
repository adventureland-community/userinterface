import { e, getReact } from "../../../host/react";
import {
  isEcuDevBuild,
  resolveDevLanInstallUrl,
  resolveInstallScriptUrl,
  type DevLanInstallInfo,
  type InstallScriptUrlInfo,
} from "../../../lib/installScriptUrl";
import { encodeQrSvg } from "../../../lib/qrSvg";
import { isPhoneViewport } from "../../../lib/perfPrefs";

function copyUrl(
  url: string,
  setCopied: (next: boolean) => void,
): void {
  if (!navigator.clipboard || !navigator.clipboard.writeText) return;
  void navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  });
}

function scriptUrlRow(
  key: string,
  url: string,
  copied: boolean,
  onCopy: () => void,
): any {
  return e(
    "div",
    { key, className: "ecu-settings-row" },
    e(
      "div",
      { className: "ecu-settings-row-copy" },
      e("span", { className: "ecu-settings-row-label" }, "Script URL"),
      e(
        "span",
        { className: "ecu-settings-help ecu-settings-script-url" },
        url,
      ),
    ),
    e(
      "button",
      {
        type: "button",
        className: "ecu-settings-reset",
        onClick: onCopy,
      },
      copied ? "Copied" : "Copy URL",
    ),
  );
}

function qrCard(key: string, url: string, label: string, help: string): any {
  const svg = encodeQrSvg(url);
  return e(
    "div",
    {
      key,
      className: "ecu-settings-qr-card",
      title: url,
    },
    e("span", {
      className: "ecu-settings-qr-card__img",
      dangerouslySetInnerHTML: { __html: svg },
    }),
    e("span", { className: "ecu-settings-qr-card__label" }, label),
    e("span", { className: "ecu-settings-qr-card__help" }, help),
  );
}

function hostHint(url: string): string {
  const m = /^https?:\/\/([^/:]+)/i.exec(url);
  return m ? m[1] : url;
}

export function InstallScriptQrCard(): any {
  const React = getReact();
  const [info, setInfo] = React.useState(null as InstallScriptUrlInfo | null);
  const [devInfo, setDevInfo] = React.useState(null as DevLanInstallInfo | null);
  const [devOpen, setDevOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [devCopiedUrl, setDevCopiedUrl] = React.useState("");
  const phone = isPhoneViewport();
  const showDevFold = isEcuDevBuild();

  React.useEffect(() => {
    let cancelled = false;
    void resolveInstallScriptUrl().then((next) => {
      if (!cancelled) setInfo(next);
    });
    if (showDevFold) {
      void resolveDevLanInstallUrl().then((next) => {
        if (cancelled || !next) return;
        setDevInfo(next);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [showDevFold]);

  if (!info) {
    return e(
      "p",
      { key: "script-qr-loading", className: "ecu-settings-help" },
      "Resolving script URL…",
    );
  }

  const kids: any[] = [
    e(
      "p",
      { key: "script-qr-help", className: "ecu-settings-help" },
      "Scan or copy the GitHub raw userscript to install ECU in Tampermonkey.",
    ),
  ];

  // QR is for desktop → phone handoff; useless while already on the phone.
  if (!phone) {
    kids.push(
      e(
        "div",
        { key: "script-qr-row", className: "ecu-settings-qr-row" },
        qrCard("script-qr", info.url, "ECU script", "GitHub raw"),
      ),
    );
  }

  kids.push(
    scriptUrlRow("script-url-row", info.url, copied, () =>
      copyUrl(info.url, setCopied),
    ),
  );

  if (showDevFold) {
    const urls = devInfo?.urls || [];
    kids.push(
      e(
        "div",
        { key: "dev-lan-fold", className: "ecu-settings-dev-fold" },
        e(
          "button",
          {
            type: "button",
            className: "ecu-settings-dev-fold__toggle",
            "aria-expanded": devOpen ? "true" : "false",
            onClick: () => setDevOpen((open: boolean) => !open),
          },
          e(
            "span",
            { className: "ecu-settings-dev-fold__chevron" },
            devOpen ? "▾" : "▸",
          ),
          "Dev · LAN install",
        ),
        devOpen
          ? e(
              "div",
              { className: "ecu-settings-dev-fold__body" },
              e(
                "p",
                { className: "ecu-settings-help" },
                "Phone: install the full LAN userscript (same idea as GitHub raw). After a watch rebuild, Tampermonkey → Check for userscript updates. The thin /dev.user.js loader is desktop-oriented — mobile TM often cannot GM.xhr to HTTP LAN. Tailscale / VPN omitted.",
              ),
              !devInfo
                ? e(
                    "p",
                    { className: "ecu-settings-help" },
                    "Resolving LAN URL…",
                  )
                : !urls.length
                  ? e(
                      "p",
                      { className: "ecu-settings-help" },
                      "No RFC1918 / loopback install URL baked — check Wi‑Fi and rebuild with npm run watch.",
                    )
                  : e(
                      "div",
                      null,
                      !phone
                        ? e(
                            "div",
                            {
                              key: "dev-qr-row",
                              className: "ecu-settings-qr-row",
                            },
                            ...urls.map((u: string) =>
                              qrCard(
                                "dev-qr-" + u,
                                u,
                                hostHint(u),
                                "LAN · .user.js",
                              ),
                            ),
                          )
                        : null,
                      ...urls.map((u: string) =>
                        scriptUrlRow(
                          "dev-url-" + u,
                          u,
                          devCopiedUrl === u,
                          () => {
                            copyUrl(u, (ok) => {
                              setDevCopiedUrl(ok ? u : "");
                            });
                          },
                        ),
                      ),
                    ),
            )
          : null,
      ),
    );
  }

  return e("div", { key: "script-qr-block" }, ...kids);
}
