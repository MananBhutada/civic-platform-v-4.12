import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { complaintsApi, uploadApi, apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function NewComplaint() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ title: '', description: '', address: '', city: '', ward: '' });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null); // {result, trust_score, reasons, message}

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const locate = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access. Enter the address manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Full metadata payload for the image-verification pipeline
        // (backend/src/controllers/imageVerificationController.js) —
        // GPS gives the trust-score engine its "gps_available" signal,
        // and the rest lets officers sanity-check when/how a photo was taken.
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? null,
          captured_at: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userAgent: navigator.userAgent,
        });
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Please allow location access, or enter the address manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (confirmedDuplicateOf) => {
    setError('');
    setVerificationResult(null);
    if (!coords && !confirmedDuplicateOf) {
      setError('Add a location before submitting — tap "Use my current location".');
      return;
    }
    setSubmitting(true);

    // ── Photo attached: route through the image-verification + trust-score
    // pipeline (POST /complaints/verified) instead of the plain JSON create.
    // This is additive — reports filed without a photo still use the
    // original flow below unchanged.
    if (file && !confirmedDuplicateOf) {
      try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('latitude', coords.latitude);
        fd.append('longitude', coords.longitude);
        if (coords.accuracy != null)    fd.append('accuracy', coords.accuracy);
        if (coords.captured_at)         fd.append('captured_at', coords.captured_at);
        if (coords.timezone)            fd.append('timezone', coords.timezone);
        if (coords.userAgent)           fd.append('userAgent', coords.userAgent);
        if (coords.heading != null)     fd.append('heading', coords.heading);

        const { data } = await complaintsApi.createVerified(fd);

        if (data.result === 'approved') {
          toast.success('Complaint verified and filed into the register.');
          navigate(`/citizen/complaints/${data.complaint.id}`);
          return;
        }

        // 'review' (60-79) or 'rejected' (<60) — show the citizen what happened
        // instead of silently failing.
        setVerificationResult(data);
        setSubmitting(false);
        return;
      } catch (err) {
        setError(apiError(err, 'Could not verify and file the complaint.'));
        setSubmitting(false);
        return;
      }
    }

    try {
      let image_url = null;
      if (file) {
        const up = await uploadApi.complaintImage(file);
        image_url = up.data.image_url;
      }
      const payload = {
        ...form,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        image_url,
      };
      if (confirmedDuplicateOf) payload.confirmed_duplicate_of = confirmedDuplicateOf;

      const { data } = await complaintsApi.create(payload);

      if (data.is_duplicate) {
        setDuplicate(data);
        setSubmitting(false);
        return;
      }

      toast.success('Complaint filed and entered into the register.');
      navigate(`/citizen/complaints/${data.complaint.id}`);
    } catch (err) {
      setError(apiError(err, 'Could not file the complaint.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    submit(null);
  };

  const upvoteExisting = async () => {
    try {
      await complaintsApi.upvote(duplicate.duplicate_of);
      toast.success('Upvoted the existing report on your behalf.');
      navigate(`/citizen/complaints/${duplicate.duplicate_of}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not upvote that report.'));
    }
  };

  const fileAnyway = () => submit(duplicate.duplicate_of);

  if (verificationResult) {
    const isRejected = verificationResult.result === 'rejected';
    return (
      <AppShell title={isRejected ? 'Photo could not be verified' : 'Sent for manual review'} subtitle="Filing a new complaint">
        <div className="card card-pad" style={{ maxWidth: 560 }}>
          <div className="eyebrow">{isRejected ? 'Verification failed' : 'Quick human check needed'}</div>
          <h2 className="section-title" style={{ marginBottom: 10 }}>
            {verificationResult.message}
          </h2>
          <p className="faint" style={{ marginBottom: 10 }}>
            Trust score: {verificationResult.trust_score}/100
          </p>
          {Array.isArray(verificationResult.reasons) && verificationResult.reasons.length > 0 && (
            <ul style={{ marginBottom: 18 }}>
              {verificationResult.reasons.map((reason, i) => <li key={i} className="faint">{reason}</li>)}
            </ul>
          )}
          <div className="row gap-12">
            {isRejected && (
              <button className="btn btn-ghost" onClick={() => setVerificationResult(null)}>Try a different photo</button>
            )}
            {!isRejected && (
              <button className="btn btn-seal" onClick={() => navigate('/citizen/complaints')}>Okay, got it</button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  if (duplicate) {
    return (
      <AppShell title="Possible duplicate found" subtitle="Filing a new complaint">
        <div className="card card-pad" style={{ maxWidth: 560 }}>
          <div className="eyebrow">Similar report on file</div>
          <h2 className="section-title" style={{ marginBottom: 10 }}>{duplicate.message}</h2>
          <p className="faint" style={{ marginBottom: 18 }}>
            Match confidence: {Math.round((duplicate.duplicate_score || 0) * 100)}%. Upvoting the existing report
            raises its priority instead of splitting attention across two entries.
          </p>
          <div className="row gap-12">
            <button className="btn btn-seal" onClick={upvoteExisting}>Upvote existing report</button>
            <button className="btn btn-ghost" onClick={fileAnyway} disabled={submitting}>
              {submitting ? 'Filing…' : 'File as a separate complaint'}
            </button>
            <button className="btn btn-ghost" onClick={() => setDuplicate(null)}>Go back</button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="File a complaint" subtitle="Every detail helps officers act faster">
      <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
        <div className="card card-pad">
          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label>Title</label>
            <input type="text" name="title" required maxLength={200} value={form.title} onChange={onChange} placeholder="e.g. Large pothole outside 14 MG Road" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea name="description" required value={form.description} onChange={onChange} placeholder="What did you see? How long has it been there? Any safety risk?" />
            <div className="hint">Our classifier reads this to route your report to the right department automatically.</div>
          </div>

          <div className="field">
            <label>Photo <span className="faint">(recommended)</span></label>
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              {preview ? <img src={preview} alt="Preview" /> : <div style={{ padding: '10px 0' }}>Tap to add a photo of the issue</div>}
              <div>{file ? file.name : 'JPG or PNG, up to a few MB'}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>

          <div className="field">
            <label>Location</label>
            <button type="button" className="btn btn-ghost" onClick={locate} disabled={locating}>
              {locating ? 'Locating…' : coords ? 'Location captured ✓' : 'Use my current location'}
            </button>
            {coords && (
              <div className="hint mono">{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</div>
            )}
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>Address <span className="faint">(optional)</span></label>
              <input type="text" name="address" value={form.address} onChange={onChange} placeholder="Auto-filled if left blank" />
            </div>
            <div className="field">
              <label>City <span className="faint">(optional)</span></label>
              <input type="text" name="city" value={form.city} onChange={onChange} />
            </div>
          </div>
          <div className="field">
            <label>Ward <span className="faint">(optional)</span></label>
            <input type="text" name="ward" value={form.ward} onChange={onChange} />
          </div>

          <button className="btn btn-seal btn-block" disabled={submitting} type="submit">
            {submitting ? 'Filing complaint…' : 'Submit to the register'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
