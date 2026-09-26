/** Әлі жасалмаған экран. Оқу мазмұны ойдан қосылмайды — тек күйі көрсетіледі. */
export function NotBuilt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="card px-16 py-12 text-center">
        <p className="text-h2 font-extrabold text-ink-soft">Бұл экран келесі кезеңде жасалады</p>
      </div>
    </div>
  );
}
