import type { CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import capturedCSS from "../styles/site.css?raw";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Login | GDM" }] }),
  staticData: { importedDocument: { html: { "lang": "fr-FR" }, body: { "className": "login-page" } } },
  component: Index,
});

function Index() {
  return (
    <>
      <style>{capturedCSS}</style>
      <div style={{ display: "none", position: "absolute", inset: "0px", zIndex: "99999999", textAlign: "center" }}>
        <div style={{ background: "rgb(255, 255, 255)", padding: "12px 30px", borderRadius: "5px", display: "inline-block", marginTop: "10px", border: "1px solid white" }}>
          <img src="/site-assets/485ab03617b0bb77.gif" />
        </div>
      </div>
      <div className="wrapper inset-0 ml-auto mr-auto overflow-hidden pl-[15px] pr-[15px] absolute">
        <table className={"\x74able-login border-collapse h-full ml-auto mr-auto w-auto [border-spacing:0px]"}>
          <tbody>
            <tr>
              <td>
                <div className="m-auto">
                  <div style={{ textAlign: "center", fontSize: "24px", textShadow: "rgb(23, 100, 168) 2px 2px", color: "white", marginBottom: "35px" } as CSSProperties} id="div-main-title">Polyclinique EDELWEISS</div>
                </div>
                <div className="login-grid m-auto w-[600px]">
                  <div className="login-holder border-0 rounded-[10px] h-fit pt-[20px] pr-0 pb-[65px] pl-0 relative">
                    <div>
                      <div className={"\x62ox-login h-auto m-auto w-[280px]"}>
                        <div>
                          <div className="alert alert-danger alert-dismissible border border-solid border-transparent border-[#ebccd1]! rounded-[4px] mb-[20px] text-center!" style={{ display: "none", position: "absolute", left: "145px", top: "130px", right: "0px" }} id="login-err" role="alert">
                                              Login ou mot de passe incorrect.
                                          </div>
                          <div className="login-logo-holder h-[150px] m-auto w-full" />
                          <div className="user-login m-auto text-left w-auto [padding:inherit]">
                            <h2>Direction Générale de la Marine Marchande</h2>
                            <form id="login-form" method="post" autoComplete="off">
                              <input type="hidden" name="_csrf" defaultValue="ZGRrazJ5LXgyLTxYRThfTAEgBjt4EVRPNjZeGVE1GhoNOy4McQFMHw==" />
                              <div className="form-group required mb-[15px] relative"><i className="glyphicon glyphicon-user left-[8px] leading-none absolute top-[8px]" /><input className="form-control" type="text" id="useridentity-username" name="UserIdentity[username]" autoComplete="off" autoFocus placeholder="Nom d'utilisateur" /><div className="help-block mt-[5px]" /></div>
                              <div className="form-group required mb-[15px] relative"><i className="glyphicon glyphicon-lock left-[8px] leading-none absolute top-[8px]" /><input className="form-control" style={{ display: "none" }} type="text" id="useridentity-password" name="UserIdentity[password]" autoComplete="off" placeholder="Mot de passe" accessKey="" {...({ tabIndex: "" } as any)} /><input className="form-control" type="text" id="useridentity-passwordClone0" name="useridentity-passwordClone0" autoComplete="off" placeholder="Mot de passe" /><div className="help-block mt-[5px]" /></div>
                              <div>
                                <button className="login-btn border border-solid border-[#70a1c4] border-current! rounded-[4px] border-none! h-[29px] overflow-visible w-full [border-image:none] [border-width:medium]!" type="submit">Connexion</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td>Copyright © GDM 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ position: "absolute", top: "-10000px", width: "1px", height: "1px" }} id="div-print" />
      <div id="div-sdialog" />
      <div id="div-sdialogR" />
    </>
  );
}
